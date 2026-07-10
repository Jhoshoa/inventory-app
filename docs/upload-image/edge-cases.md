# Edge cases y multi-tenant isolation

## Aislamiento por store (multi-tenant)

### Cómo se protege

Cada producto pertenece a un `store_id`. El usuario autenticado tiene un
`store_id` asociado. Todas las operaciones lo verifican:

```python
# En el endpoint de upload
product = await repo.get_by_id(product_id)
if not product or product.store_id != user.store_id:
    raise HTTPException(404, "Producto no encontrado")
```

Esto significa:

| Escenario | Resultado |
|---|---|
| Store A sube foto a producto de Store B | 404 Not Found (el producto no existe para ellos) |
| Store A ve producto de Store B en listado | ✅ El producto se ve, `photo_url` se renderiza desde Cloudinary |
| Store A ve foto de Store B en detalle | ✅ La URL de Cloudinary es pública, cualquiera puede ver la imagen |

### public_id en Cloudinary

El `public_id` identifica la imagen dentro de tu cuenta de Cloudinary. Se debe
generar con un formato que evite colisiones y permita rastrear el origen:

```
products/{store_id}/{product_id}_{timestamp}
```

Ejemplo:
```
products/a1b2c3d4-.../e5f6g7h8-..._1689000000
```

Esto da:
- **Aislamiento visual**: listing por store_id en Cloudinary console
- **Sin colisiones**: `product_id` es UUID único global
- **Trazabilidad**: se sabe a qué store y producto pertenece cada imagen

> **Nota:** Incluir `store_id` en el path de Cloudinary es opcional para
> el funcionamiento, pero muy útil para depuración y limpieza.

---

## Edge cases

### 1. Reemplazo de foto — eliminar la anterior

```
Producto con photo_url = https://res.cloudinary.com/.../products/abc_old.jpg

1. Usuario sube nueva foto
2. Backend extrae public_id de la URL vieja: "products/abc_old"
3. Backend elimina la vieja de Cloudinary: cloudinary.uploader.destroy("products/abc_old")
4. Backend sube la nueva con nuevo public_id
5. Backend actualiza photo_url en BD
```

**¿Qué pasa si Cloudinary falla al eliminar la vieja?**
- No bloquear la subida nueva. La imagen vieja queda huérfana en Cloudinary.
- Loggear el error para limpieza posterior.

### 2. Producto eliminado durante el upload

```
1. Usuario abre formulario de edición (product existe)
2. Otro usuario elimina el producto
3. Usuario sube foto
```

**Solución:** El endpoint verifica que el producto existe y no está eliminado
(`is_active = True`, `deleted_at IS NULL`) ANTES de subir a Cloudinary. Si el
producto ya no existe, devolver 404 y no subir nada.

### 3. Upload concurrente al mismo producto

```
1. Usuario A sube foto1 a producto X
2. Usuario B sube foto2 a producto X (casi simultáneo)
```

**Riesgo:** Race condition donde `foto1` se guarda en BD, luego `foto2`
sobrescribe el `photo_url` en BD, pero `foto1` no se elimina de Cloudinary
porque la URL vieja era `null`.

**Solución:**
- Usar `version` field (optimistic locking). El producto tiene `version`
  que se incrementa en cada update. Si la versión no coincide, rechazar
  con HTTP 409.
- **Detalle de implementación:** El endpoint `POST /products/{id}/photo`
  debe aceptar un campo opcional `version: int`. Si se envía y no coincide
  con el valor actual en BD, responder 409. Esto permite al frontend
  detectar conflictos y pedir al usuario que recargue.
- O usar transacción atómica: `SELECT ... FOR UPDATE` dentro de una
  transacción para evitar lecturas concurrentes.

Para este proyecto, el riesgo es bajo (un store, pocos usuarios concurrentes).
Pero al menos el endpoint debe retornar el `ProductResponseDTO` con el
`version` actualizado para que el frontend pueda detectar conflictos.

### 4. Cloudinary no responde

```
1. Usuario sube foto
2. Backend valida el archivo OK
3. Cloudinary.upload() falla (timeout, 5xx, rate limit)
```

**Solución:**
- Timeout de conexión: 10 segundos
- Reintentar 1 vez
- Si falla, devolver 502 con mensaje "Error al subir imagen. Intente nuevamente"
- No modificar BD si Cloudinary falló

### 5. Archivo corrupto o vacío

- Archivo de 0 bytes → rechazar con 400 "El archivo está vacío"
- Archivo con magic bytes falsos (ej: JPEG header pero data corrupta) → Cloudinary
  lo rechazará. Devolver el error de Cloudinary al usuario.
- Archivo renombrado (ej: `virus.exe` → `foto.jpg`) → lo detectan los
  magic bytes antes de enviar a Cloudinary.

### 6. Timeout de subida (archivos grandes)

Si el archivo es grande y lento, el proxy reverso (Nginx, Traefik) puede
cerrar la conexión antes de que el backend termine de leer.

**Solución:**
- Límite de 5 MB mantiene los archivos pequeños
- Configurar `client_max_body_size` en Nginx (si aplica)
- Usar streaming de UploadFile (FastAPI lo hace por defecto)

### 7. Foto sin producto (create + photo en un solo paso)

El usuario quiere crear un producto y subir la foto en el mismo formulario.

**Problema:** No pueden subir la foto al endpoint `POST /products/{id}/photo`
porque el producto aún no existe (no tiene id).

**Alternativas:**

| Opción | Cómo funciona | Pros | Contras |
|---|---|---|---|
| **Enfoque separado (recomendado)** | 1. Crear producto (JSON, sin foto)<br>2. Subir foto a `/products/{id}/photo` | Simple, no cambia endpoints existentes | Dos pasos para el usuario |
| **Flujo combinado con endpoint temporal** | 1. Subir foto a `/uploads/temp` -> devuelve URL<br>2. Crear producto con `photo_url: url` | Un solo paso visual | Imagen huérfana si nunca se crea el producto. Necesita limpieza periódica |
| **Endpoint create multipart** | `POST /products` acepta FormData con file + campos | Un solo paso, un solo request | Complejidad de multipart. El frontend debe cambiar a FormData |

**Decisión:** Usar **enfoque separado**. El formulario de creación muestra
el `ImageUploader` después de creado el producto (redirige a la página de
edición/detalle). Esto es común en muchas apps (Amazon, Shopify, etc.).

### 8. Imágenes huérfanas en Cloudinary

Ocurren cuando:
- Se sube una foto pero el request de PATCH falla (enfoque directo)
- Se elimina un producto pero no se elimina la foto de Cloudinary
- El servidor se cae entre el upload a Cloudinary y el guardado en BD

**Mitigación:**
- En server-side upload, el guardado en BD ocurre DESPUÉS de Cloudinary,
  dentro de la misma request. Si algo falla, la imagen en Cloudinary queda
  huérfana pero es un caso raro.
- Agregar un script programado (cron mensual) que liste productos con
  `photo_url` y verifique que las imágenes existen en Cloudinary, o
  viceversa.

### 9. Tipos MIME engañosos (polyglot files)

Un archivo que es a la vez una imagen PNG válida y contiene código
JavaScript incrustado. Esto es raro pero posible.

**Mitigación:**
- Cloudinary procesa la imagen y la sirve como imagen. Si el archivo tiene
  código extra, Cloudinary lo elimina al transformarlo (redimensionar,
  cambiar formato).
- Adicionalmente, el endpoint puede usar `Pillow` para abrir y re-exportar
  la imagen, eliminando cualquier metadata o payload extra.

### 10. Caché de imagen obsoleta

Después de reemplazar la foto, el navegador del usuario puede mostrar la
imagen antigua por caché.

**Solución:**
- Cloudinary permite agregar un versionado automático a la URL:
  `https://res.cloudinary.com/.../v2/products/...` (cambiar `v1` por `v2`)
- O usar el `updated_at` del producto como query param:
  `photo_url?t=1689000000`

### 11. Almacenamiento de `photo_url` legacy

Si antes se almacenaban URLs locales o rutas de archivo, el endpoint de
eliminación de foto debe validar que la `photo_url` actual es una URL de
Cloudinary antes de intentar extraer el `public_id` y eliminarla.

### 12. Store_id en public_id — validación adicional

Aunque el `store_id` se verifica en el endpoint, incluirlo en el
`public_id` de Cloudinary permite:

```
/products/{store_id}/{product_id}_{timestamp}
```

Si por un bug un producto de Store A se procesa con datos de Store B,
la imagen quedaría en el path de Store A. No es un problema de seguridad
(los datos del producto siguen siendo correctos) pero ayuda a detectar
anomalías en la consola de Cloudinary.

### 13. `photo_url` legacy (no-Cloudinary)

Si el producto tiene una `photo_url` que **no** es de Cloudinary (ej: ruta
local antigua, URL de otro servicio), el endpoint de DELETE no debe
intentar extraer `public_id` ni eliminar de Cloudinary.

**Solución:** Validar que la URL coincide con el patrón de Cloudinary
antes de intentar la eliminación:

```python
import re
CLOUDINARY_URL_PATTERN = re.compile(r"https?://res\.cloudinary\.com/")

def is_cloudinary_url(url: str) -> bool:
    return bool(CLOUDINARY_URL_PATTERN.match(url))

# En DELETE /products/{id}/photo
if product.photo_url and is_cloudinary_url(product.photo_url):
    public_id = parse_public_id_from_url(product.photo_url)
    await storage.delete(public_id)
# Si no es Cloudinary, solo limpiar el campo en BD
product.photo_url = None
```

### 14. Formato inesperado de URL de Cloudinary

Cloudinary puede devolver URLs con formato ligeramente diferente:
- Con versión: `v123456/`
- Sin versión: (solo para cuentas muy antiguas)
- Con subfolders: `/image/upload/c_fill,h_800,w_800/...` (transformaciones inline)

**Solución:** La función `parse_public_id_from_url()` debe ser robusta
y usar regex flexible (ver `architecture.md` para la implementación
propuesta). Probar con varios formatos de URL.

### 15. Re-upload de la misma imagen (contenido duplicado)

Cloudinary detecta contenido duplicado y puede devolver la misma URL para
imágenes idénticas subidas con el mismo `public_id`.

**Solución:** No es un problema — si el `public_id` incluye `timestamp`,
cada subida genera un nuevo ID aunque el contenido sea el mismo. La imagen
anterior se elimina antes de subir la nueva.
