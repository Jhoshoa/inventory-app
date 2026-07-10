# Arquitectura de upload de imágenes

## Endpoints

### `POST /api/v1/products/{product_id}/photo`

Sube o reemplaza la foto de un producto.

```
Request:
  Content-Type: multipart/form-data
  Body:
    file: UploadFile (image/jpeg, image/png, image/webp)

Response 200:
  {
    "id": "uuid",
    ...
    "photo_url": "https://res.cloudinary.com/.../products/uuid.jpg",
    ...
  }

Response 400:
  { "detail": "La imagen no debe superar los 5 MB" }

Response 415:
  { "detail": "Formato no soportado. Usar JPEG, PNG o WebP" }
```

**Lógica:**
1. Validar autenticación (`require_owner`)
2. Validar que el producto existe, no está eliminado (`deleted_at is NULL`),
   y pertenece al store del usuario (`product.store_id == user.store_id`)
3. Validar `file.content_type` en lista blanca (`image/jpeg`, `image/png`, `image/webp`)
4. Leer bytes y validar tamaño ≤ 5 MB
5. Validar magic bytes del archivo (independiente del content-type)
6. Si el producto ya tiene `photo_url`, eliminar la imagen anterior de Cloudinary
   (extraer `public_id` de la URL vieja y llamar `cloudinary.uploader.destroy()`)
7. Subir nueva imagen con `public_id = f"products/{store_id}/{product_id}_{timestamp}"`
8. Actualizar `product.photo_url` en BD
9. Devolver `ProductResponseDTO` con `version` actualizado

**Edge cases manejados:**
- Producto eliminado durante el upload → 404 antes de subir a Cloudinary
- Cloudinary timeout → 502, no modificar BD
- Reemplazo de foto y Cloudinary falla al eliminar la vieja → loggear error,
  no bloquear la subida nueva
- Archivo vacío/corrupto → 400 antes de enviar a Cloudinary

### `DELETE /api/v1/products/{product_id}/photo`

Elimina la foto de un producto.

```
Response 200:
  {
    "id": "uuid",
    ...
    "photo_url": null,
    ...
  }
```

**Lógica:**
1. Validar autenticación y ownership (`require_owner` + `store_id`)
2. Validar que el producto existe y no está eliminado
3. Si `photo_url` es null, responder OK sin hacer nada (idempotente)
4. Validar que `photo_url` es una URL de Cloudinary (no rutas locales legacy)
5. Extraer `public_id` de la URL de Cloudinary
6. Llamar `CloudinaryPhotoStorage.delete(public_id)`
7. Poner `product.photo_url = None` en BD
8. Devolver `ProductResponseDTO` con `version` actualizado

---

## Frontend: Componente ImageUploader

```typescript
interface ImageUploaderProps {
  currentUrl?: string | null;     // URL actual (modo edición)
  onFileSelect: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
}

type UploadState = "idle" | "selected" | "uploading" | "error";
```

**Layout propuesto:**

```
┌──────────────────────────────────────┐
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │   Arrastra tu imagen aquí     │  │
│  │   o haz clic para seleccionar │  │
│  │                                │  │
│  │   📷 Abrir cámara             │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  Formatos: JPEG, PNG, WebP          │
│  Tamaño máximo: 5 MB                │
└──────────────────────────────────────┘
```

**Estados visuales:**

| Estado | UI |
|---|---|
| `idle` | Drop zone con ícono + instrucciones + botón cámara |
| `selected` | Preview thumbnail + nombre archivo + botón "Quitar" |
| `uploading` | Spinner + barra de progreso (indeterminada) |
| `error` | Mensaje de error + botón reintentar |

**Captura desde cámara (mobile):**
```html
<input
  type="file"
  accept="image/*"
  capture="environment"
/>
```

---

## FormData multipart

El formulario de producto debe cambiar de JSON a FormData para soportar el
archivo de imagen. La estructura del FormData sería:

```
name: "Producto X"
price: "29.99"
stock: "10"
category_id: "uuid"
...
file: (binary image data)
```

El backend (FastAPI) recibiría tanto los campos como el archivo:

```python
@router.post("/products", response_model=ProductResponseDTO, status_code=201)
async def create_product(
    name: str = Form(...),
    price: Decimal = Form(...),
    stock: int = Form(...),
    ...
    file: UploadFile | None = File(None),
    ...
):
```

**Alternativa recomendada (más limpia):**
Mantener los endpoints create/update como JSON y que el upload de imagen sea
un paso separado (`POST /products/{id}/photo`). Esto evita complejidad de
multipart en los formularios existentes. El flujo sería:

1. Usuario llena formulario (JSON) y hace submit → producto se crea sin foto
2. Usuario sube foto en el detail/edit mediante `ImageUploader`
3. La foto se envía a `POST /products/{id}/photo`
4. El producto se actualiza con la URL

**Ventajas del approach separado:**
- No modificar los endpoints create/update existentes
- El `ImageUploader` es independiente y reutilizable
- Mejor experiencia: el usuario puede crear el producto primero y subir la
  foto después
- El archivo se envía directamente al endpoint correcto sin mezclarse con
  datos del formulario

---

## Flujo detallado (recomendado)

```
ProductForm (JSON)           ImageUploader (multipart)
      │                             │
      │  POST /products             │
      │  { name, price, ... }       │
      │                             │
      │◄──── { id, photo_url: null }│
      │                             │
      │  ─── usuario sube foto ────>│
      │                             │  POST /products/{id}/photo
      │                             │  FormData: file
      │                             │
      │                             │  Cloudinary.upload()
      │                             │
      │◄──── { id, photo_url: url } │
```

## Dependencias

### Backend (ya instaladas)
- `cloudinary>=1.42` ✅

### Frontend (nuevas)
- `react-dropzone` (opcional, para drag & drop nativo)

Actualmente no se necesita ningún paquete adicional de Cloudinary en el
frontend porque la subida va al backend, no directamente a Cloudinary.

---

## Configuraciones adicionales del backend

### FastAPI: tamaño máximo de upload

FastAPI (Starlette) tiene un límite por defecto de `max_form_memory_size`
(1 MB para campos de formulario no-archivo). Para el endpoint de upload,
se debe configurar en la creación de la app:

```python
app = FastAPI(
    max_form_memory_size=5 * 1024 * 1024,  # 5 MB para form fields
)
```

Además, si se usa Nginx/Traefik como proxy reverso, configurar:

```
client_max_body_size 10M;  # Nginx
```

### Settings: `MAX_IMAGE_SIZE_MB`

Agregar a `src/config/settings.py`:

```python
MAX_IMAGE_SIZE_MB: int = 5
MAX_IMAGE_SIZE_BYTES: int = fields.computed(
    lambda self: self.MAX_IMAGE_SIZE_MB * 1024 * 1024
)
```

### CSP (Content Security Policy)

Agregar los dominios de Cloudinary a `img-src` para permitir la carga de
imágenes desde Cloudinary:

```
Content-Security-Policy: img-src 'self' https://res.cloudinary.com ...;
```

---

## Migración de base de datos

**No se necesita migración.** La columna `photo_url` ya existe en la tabla
`products` (definida en `ProductModel.photo_url: String(500)`). Solo se
actualiza su valor mediante los endpoints.

---

## Utilidades necesarias

### Extraer `public_id` de URL de Cloudinary

El endpoint de DELETE y el reemplazo de foto necesitan extraer el
`public_id` de la `photo_url` actual para eliminar la imagen anterior.

Formato de URL de Cloudinary:
```
https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<public_id>.<ext>
```

Función utilitaria propuesta:

```python
import re
from urllib.parse import urlparse

CLOUDINARY_URL_PATTERN = re.compile(
    r"https?://res\.cloudinary\.com/[^/]+/image/upload/v?\d+/(.+)\.\w+$"
)

def parse_public_id_from_url(url: str) -> str | None:
    """Extrae el public_id de una URL de Cloudinary."""
    match = CLOUDINARY_URL_PATTERN.match(url)
    if match:
        return match.group(1)
    # Fallback: tomar la parte entre /upload/ y la extensión
    path = urlparse(url).path
    if "/upload/" in path:
        parts = path.split("/upload/")[1]
        # Quitar versión si existe (v123456/)
        parts = re.sub(r"^v\d+/", "", parts)
        # Quitar extensión
        return re.sub(r"\.\w+$", "", parts)
    return None
```

### `CloudinaryPhotoStorage` — signature update

El método `upload(image_bytes, filename)` actual genera internamente
`public_id = f"products/{filename}"`. Se debe actualizar para aceptar
un `public_id` personalizado:

```python
class CloudinaryPhotoStorage(IPhotoStorage):
    async def upload(
        self, image_bytes: bytes, public_id: str, filename: str | None = None
    ) -> str:
        ...
```

Y agregar el método `delete(public_id: str) -> bool` que actualmente no
existe en la interfaz.

---

## Estructura de archivos nueva

```
apps/backend/src/
  presentation/
    api/v1/products.py          ← agregar endpoints photo + delete photo
  presentation/dependencies.py  ← wire CloudinaryPhotoStorage

apps/web/src/
  features/products/
    components/
      ImageUploader.tsx          ← NUEVO: componente de upload
      ImageUploader.test.tsx     ← NUEVO: tests
    actions.ts                   ← modificar (add photo action)
    types.ts                     ← modificar si es necesario
    schemas.ts                   ← agregar validación de archivo
  components/ui/
    FileUpload.tsx               ← NUEVO: componente base reutilizable
```

---

## Integración con ProductForm

El `ProductForm` actual tiene mode `create | edit`. La foto se manejará en
un paso separado, no dentro del formulario principal. Esto significa:

- `ProductForm`: Sin cambios en el formulario (sigue siendo JSON)
- `ImageUploader`: Nuevo componente colocado **debajo del formulario** o
  en la página de detalle del producto
- En la página de edición, el `ImageUploader` muestra la foto actual
  (`currentUrl`) y permite reemplazarla o eliminarla

### Páginas afectadas

| Página | Cambio |
|---|---|
| `products/[productId]/page.tsx` | Agregar `ImageUploader` + mostrar `photo_url` |
| `products/[productId]/edit/page.tsx` | Agregar `ImageUploader` con `currentUrl` |
| `products/new/page.tsx` | Sin cambios (la foto se agrega después) |
