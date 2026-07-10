# Seguridad en upload de imágenes

## Principios

1. **Nunca confiar en validaciones del cliente** — todo archivo se revalida
   en el backend antes de procesarlo
2. **No exponer credenciales de Cloudinary al frontend** — el `api_secret`
   nunca debe estar en código del navegador
3. **Validar contenido, no solo extensión** — los magic bytes son más
   confiables que el `content-type` del header HTTP
4. **Proteger contra DoS** — limitar tamaño y rate de uploads
5. **Aislar por store** — un usuario no puede modificar fotos de productos
   de otro store

---

## Validación server-side

### 1. Tipo MIME (lista blanca)

```python
ALLOWED_MIME_TYPES = {
    "image/jpeg",   # .jpg, .jpeg
    "image/png",    # .png
    "image/webp",   # .webp
}
```

Por qué lista blanca y no negra: es más seguro permitir explícitamente lo
que se necesita que prohibir formatos conocidos. Un atacante puede disfrazar
un `.exe` como `.png` cambiando la extensión.

### 2. Magic bytes (validación de contenido real)

El `content-type` del header HTTP puede ser manipulado por un cliente
malicioso. Se debe validar el contenido real del archivo usando los
primeros bytes (signature / magic number):

| Formato | Magic bytes (hex) |
|---|---|
| JPEG | `FF D8 FF E0` o `FF D8 FF E1` |
| PNG | `89 50 4E 47 0D 0A 1A 0A` |
| WebP | `52 49 46 46 .... 57 45 42 50` |

Implementación liviana (sin dependencias externas):

```python
def validate_image_magic_bytes(data: bytes) -> bool:
    if len(data) < 12:
        return False
    # JPEG
    if data[0:3] == b"\xff\xd8\xff":
        return True
    # PNG
    if data[0:8] == b"\x89PNG\r\n\x1a\n":
        return True
    # WebP
    if data[0:4] == b"RIFF" and data[8:12] == b"WEBP":
        return True
    return False
```

Si se desea más robustez, instalar `python-magic` (bindings de libmagic):

```bash
pip install python-magic
```

```python
import magic
mime = magic.from_buffer(data, mime=True)
if mime not in ALLOWED_MIME_TYPES:
    raise HTTPException(415, "Formato no soportado")
```

### 3. Tamaño máximo

Límite configurable via settings:

```python
# en settings.py
MAX_IMAGE_SIZE_MB: int = 5
MAX_IMAGE_SIZE_BYTES: int = MAX_IMAGE_SIZE_MB * 1024 * 1024  # 5 MB
```

Validación:

```python
if len(image_bytes) > settings.MAX_IMAGE_SIZE_BYTES:
    raise HTTPException(400, f"La imagen no debe superar los {settings.MAX_IMAGE_SIZE_MB} MB")
```

### 4. Dimensiones máximas (opcional)

Opcionalmente redimensionar en Cloudinary (ya configurado en
`CloudinaryPhotoStorage` con `width=800`). Agregar validación si se desea
rechazar imágenes excesivamente grandes antes de subir:

```python
from PIL import Image
import io

img = Image.open(io.BytesIO(image_bytes))
if img.width > 2048 or img.height > 2048:
    raise HTTPException(400, "La imagen no debe superar 2048px de ancho/alto")
```

---

## Validación client-side (UX, no seguridad)

```typescript
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Formato no soportado. Usar JPEG, PNG o WebP";
  }
  if (file.size > MAX_SIZE) {
    return "La imagen no debe superar los 5 MB";
  }
  return null;
}
```

---

## Cloudinary: qué NO exponer

| Variable | ¿Exponer al frontend? | Razón |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | ✅ Seguro (público) | Identifica tu cuenta en URLs |
| `CLOUDINARY_API_KEY` | ❌ Preferible no exponer | Podría usarse con unsigned uploads |
| `CLOUDINARY_API_SECRET` | ❌ **Nunca** | Permite operaciones administrativas |

La arquitectura es **server-side upload**: el frontend envía el archivo al
backend, y el backend lo sube a Cloudinary. El frontend nunca interactúa
directamente con la API de Cloudinary.

---

## Rate limiting

Considerar agregar rate limiting al endpoint de upload para evitar abuso:

- Máximo 10 uploads por minuto por store
- Configurable via settings

---

## Ownership y autorización (multi-tenant)

Cada endpoint debe verificar que el producto pertenece al store del usuario
autenticado:

```python
product = await repo.get_by_id(product_id)
if not product or product.store_id != user.store_id:
    raise HTTPException(404, "Producto no encontrado")
```

### public_id con store_id

Para facilitar trazabilidad y depuración, el `public_id` en Cloudinary debe
incluir el `store_id`:

```python
public_id = f"products/{store_id}/{product_id}_{int(time.time())}"
```

Esto:
- Aísla visualmente las imágenes por store en la consola de Cloudinary
- Permite detectar anomalías (si una imagen aparece en el path de otro store)
- Facilita limpieza programática por store

### Verificación de estado del producto

Además del `store_id`, verificar que el producto no está eliminado:

```python
if not product or product.store_id != user.store_id or product.deleted_at:
    raise HTTPException(404, "Producto no encontrado")
```

---

## Limpieza de imágenes huérfanas

Cuando un producto se elimina o se reemplaza su foto, la imagen anterior en
Cloudinary debe eliminarse para evitar acumulación de archivos no referenciados.

| Acción | Limpieza |
|---|---|
| Reemplazar foto | `CloudinaryPhotoStorage.delete(public_id_viejo)` antes de subir nueva |
| Eliminar producto | Opcional: eliminar foto de Cloudinary |
| Quitar foto (set null) | `CloudinaryPhotoStorage.delete(public_id)` |

---

## Content Security Policy (CSP)

Agregar los dominios de Cloudinary a la política de seguridad de contenido
para permitir la carga de imágenes desde Cloudinary:

```
Content-Security-Policy:
  default-src 'self';
  img-src 'self' https://res.cloudinary.com https://*.cloudinary.com;
  ...
```

Sin esto, las imágenes de Cloudinary serán bloqueadas por el navegador.

### Configuración en Next.js

En `next.config.ts` (o `next.config.js`):

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; img-src 'self' https://res.cloudinary.com; ...",
          },
        ],
      },
    ];
  },
};
```

---

## Optimistic locking con `version`

Para evitar race conditions en uploads concurrentes (edge case #3), el
endpoint de upload debe aceptar un campo opcional `version`:

```python
@router.post("/{product_id}/photo")
async def upload_photo(
    product_id: UUID,
    file: UploadFile = File(...),
    version: int | None = None,  # <-- opcional para optimistic locking
    ...
):
    product = await repo.get_by_id(product_id)
    if version is not None and product.version != version:
        raise HTTPException(409, "El producto fue modificado por otro usuario. Recarga la página.")
    ...
```

Esto permite al frontend detectar conflictos. Si no se envía `version`,
el endpoint funciona sin verificación de concurrencia (compatible con
clientes antiguos).

---

## Resumen de riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Subir ejecutable como imagen | 🔴 Alta | Magic bytes validation |
| DoS por archivos enormes | 🟡 Media | Límite de 5 MB en backend |
| Sobrescritura de fotos de otros stores | 🔴 Alta | Verificación de `store_id` |
| Exposición de `api_secret` | 🔴 Alta | Server-side upload, nunca en frontend |
| Imágenes huérfanas en Cloudinary | 🟢 Baja | Limpieza en reemplazo/eliminación |
| Rate limiting | 🟡 Media | 10 uploads/minuto por store |
