# Upload de imagen de producto

## Estado actual

### Backend — infraestructura Cloudinary lista pero sin conectar

| Componente | Archivo | Estado |
|---|---|---|
| Puerto abstracto `IPhotoStorage` | `src/application/ports/photo_storage.py` | ✅ Definido |
| Implementación `CloudinaryPhotoStorage` | `src/infrastructure/services/cloudinary/photo_storage.py` | ✅ Implementado pero **nunca instanciado** |
| Config global `cloudinary.config()` | `src/config/cloudinary.py` | ✅ Existe pero **nunca importado** |
| Settings `CLOUDINARY_*` | `src/config/settings.py:18-20` | ✅ Definidos con defaults "local" |
| Endpoint de upload | — | ❌ No existe |
| Endpoints products (POST/PATCH) | `src/presentation/api/v1/products.py` | ✅ Aceptan `photo_url` como string JSON |
| `ProductModel.photo_url` | `src/infrastructure/database/models/product_model.py:39` | ✅ Columna `String(500)` |
| `Product.photo_url` (dominio) | `src/domain/entities/product.py:18` | ✅ Campo `str \| None` |
| DTOs (Create/Update/Response) | `src/application/dto/product_dto.py` | ✅ Campo `photo_url: str \| None` |
| Use cases (Create/UpdateProductInput) | `src/application/use_cases/products/` | ✅ Campo `photo_url: str \| None` |
| DI wiring (`CloudinaryPhotoStorage`) | `src/presentation/dependencies.py` | ❌ No está registrado |

### Frontend — sin UI de upload

| Componente | Archivo | Estado |
|---|---|---|
| `ProductForm.tsx` field `photo_url` | `src/features/products/components/ProductForm.tsx:236-245` | ❌ Input text `type="url"` (solo texto) |
| `ProductDetail.tsx` muestra foto | `src/features/products/components/ProductDetail.tsx` | ❌ No renderiza la imagen |
| `types.ts` `Product.photo_url` | `src/features/products/types.ts:18` | ✅ Campo `string \| null` |
| `types.ts` `ProductFormValues.photo_url` | `src/features/products/types.ts:71` | ✅ Campo `string` |
| Server actions (create/update) | `src/features/products/actions.ts` | ❌ Envían JSON, no FormData |
| Validación `validateProductForm` | `src/features/products/schemas.ts` | ❌ No valida `photo_url` |
| Componente de upload (drag & drop, cámara) | — | ❌ No existe |
| Cliente Cloudinary (npm) | `package.json` | ❌ No está instalado |
| Vista previa de imagen | — | ❌ No existe |

---

## Decisión de arquitectura: Server-side upload

Después de analizar las opciones (ver `approach-comparison.md`), se elige
**server-side upload** (a través del backend) en lugar de upload directo a
Cloudinary desde el frontend.

**Razones principales:**
1. **Multi-tenant**: el backend verifica `store_id` antes de subir la imagen.
   Con upload directo, un atacante podría subir archivos sin autenticación.
2. **Validación centralizada**: magic bytes, MIME type, tamaño, todo se valida
   en un solo lugar antes de llegar a Cloudinary.
3. **Limpieza inmediata**: al reemplazar una foto, el backend elimina la
   anterior de Cloudinary automáticamente.
4. **Infraestructura ya existe**: `IPhotoStorage` y `CloudinaryPhotoStorage`
   están implementados. Solo falta conectarlos.

> Para detalles de la comparación, ventajas/desventajas de cada enfoque y
> cuándo reconsiderar, ver `approach-comparison.md`.

## Edge cases y multi-tenant

Ver `edge-cases.md` para el análisis completo de:
- Aislamiento por store_id
- Reemplazo de foto y limpieza de imágenes anteriores
- Upload concurrente al mismo producto
- Cloudinary caído
- Archivos corruptos, polyglot, vacíos
- Timeouts y límite de tamaño
- Imágenes huérfanas
- Caché de navegador con fotos obsoletas

## Arquitectura propuesta

```
Frontend (Next.js)                     Backend (FastAPI)
┌─────────────────────┐               ┌──────────────────────────┐
│                     │   multipart   │                          │
│  ImageUploader      │ ────────────> │  POST /products/{id}/photo│
│  (drag & drop /     │   FormData    │                          │
│   file picker /     │               │  ┌────────────────────┐  │
│   camera)           │               │  │CloudinaryPhotoSt.  │  │
│                     │               │  │.upload(bytes)      │  │
│  ProductForm        │               │  └────────┬───────────┘  │
│  (photo_url string) │ <──────────── │           │               │
│                     │   JSON URL    │  Cloudinary API          │
└─────────────────────┘               └──────────────────────────┘
```

### Flujo

1. Usuario selecciona imagen (drag & drop, file picker, o cámara)
2. Frontend valida: tipo MIME, tamaño máximo (5 MB), dimensiones
3. Frontend muestra preview local (sin subir aún)
4. Usuario llena el resto del formulario y hace submit
5. Frontend envía **multipart FormData** al backend (imagen + datos)
6. Backend recibe `UploadFile`, valida nuevamente (seguridad server-side)
7. Backend sube a Cloudinary vía `CloudinaryPhotoStorage.upload()`
8. Cloudinary devuelve `secure_url`
9. Backend almacena `secure_url` en `products.photo_url`
10. Backend responde con `ProductResponseDTO` (incluye `photo_url`)
11. Frontend muestra la imagen desde Cloudinary

---

## Plan de implementación

### Fase 1 — Backend: Endpoint de upload + wiring

1. **Wire `CloudinaryPhotoStorage` en DI** (`src/presentation/dependencies.py`)
2. **Actualizar `CloudinaryPhotoStorage`**:
   - Modificar `upload()` para aceptar `public_id` como parámetro (no generarlo de `filename`)
   - Agregar método `delete(public_id) -> bool`
   - Agregar en `IPhotoStorage` la interfaz de `delete()`
3. **Agregar utilidad `parse_public_id_from_url()`** para extraer el `public_id`
   de una URL de Cloudinary (necesario para DELETE y reemplazo de foto)
4. **Agregar `MAX_IMAGE_SIZE_MB` a settings** (`src/config/settings.py`)
5. **Configurar `max_form_memory_size`** en la creación de FastAPI app
6. **Crear endpoint** `POST /api/v1/products/{product_id}/photo` que:
   - Acepte `UploadFile` (multipart)
   - Valide MIME type (image/jpeg, image/png, image/webp)
   - Valide tamaño máximo (5 MB)
   - Valide magic bytes del archivo
   - Valide dimensiones (opcional, ancho max 2048px)
   - Acepte campo opcional `version` para optimistic locking
   - Si el producto ya tiene `photo_url`, extraer `public_id` y eliminar la imagen anterior
   - Use `CloudinaryPhotoStorage.upload()` para subir a Cloudinary
   - Actualice `product.photo_url` con la URL devuelta
   - Responda con `ProductResponseDTO` (incluyendo `version` actualizado)
7. **Crear endpoint DELETE** `DELETE /api/v1/products/{product_id}/photo`:
   - Verificar que `photo_url` es de Cloudinary (no legacy)
   - Extraer `public_id` con `parse_public_id_from_url()`
   - Eliminar la imagen de Cloudinary via `CloudinaryPhotoStorage.delete()`
   - Poner `product.photo_url = None`
   - Responder con `ProductResponseDTO`
8. **Los endpoints create/update existentes se mantienen JSON-only** — el upload
   de imagen es un paso separado (`POST /products/{id}/photo`)

### Fase 2 — Frontend: Componente ImageUploader

1. **Instalar dependencias** (opcional): `react-dropzone` para drag & drop
2. **Crear `ImageUploader.tsx`**:
   - Drag & drop zone
   - File picker (`<input type="file" accept="image/*">`)
   - Botón/badge de cámara (en mobile, `capture="environment"`)
   - Preview local con `<img src={URL.createObjectURL()}>`
   - **Memory cleanup**: revocar `objectURL` con `URL.revokeObjectURL()` en
     `useEffect` cleanup para evitar memory leaks
   - Botón "Quitar foto" (llama a `DELETE /products/{id}/photo`)
   - Estados: `idle | selected | uploading | uploading-error | error`
   - Soporte para retry (reintentar sin re-seleccionar el archivo)
3. **Integrar en `ProductForm.tsx`** reemplazando el input text `photo_url`
4. **Adaptar server actions** (`actions.ts`) para enviar FormData multipart
   (o crear una action separada `uploadProductPhoto()` que llame al backend
   directamente sin pasar por el proxy de Next.js API routes, ya que FormData
   requiere `Content-Type: multipart/form-data` sin el `application/json` fijo
   de `apiRequest`)
5. **Configurar CSP en `next.config.ts`** — agregar `res.cloudinary.com` a
   `img-src` en la Content Security Policy
6. **Mostrar imagen en `ProductDetail.tsx`**
7. **Validaciones client-side**:
   - Tipo MIME: solo `image/jpeg`, `image/png`, `image/webp`
   - Tamaño máximo: 5 MB
   - Dimensiones opcionales: ancho/alto máximo

---

## Validaciones

| Capa | Validación | Cómo |
|---|---|---|
| Frontend (cliente) | Tipo MIME | `file.type` |
| Frontend (cliente) | Tamaño | `file.size <= 5 * 1024 * 1024` |
| Frontend (cliente) | Vista previa | `URL.createObjectURL(file)` |
| Frontend (cliente) | Extensiones | `accept="image/jpeg,image/png,image/webp"` |
| Backend (servidor) | Tipo MIME | `file.content_type` |
| Backend (servidor) | Magic bytes | `python-magic` o verificar header del archivo |
| Backend (servidor) | Tamaño | `len(await file.read())` |
| Backend (servidor) | Cloudinary | La API rechaza formatos no soportados |
| Backend (servidor) | Inyección | Cloudinary procesa el binario, no hay riesgo de path traversal |

---

## Seguridad

| Riesgo | Mitigación |
|---|---|
| **Archivos maliciosos** (imagen con payload) | Validar magic bytes en backend (no confiar solo en `content-type`) |
| **Denegación de servicio** (archivos enormes) | Limitar tamaño a 5 MB en frontend y backend |
| **Path traversal** en `public_id` | Cloudinary usa `public_id` alfanumérico generado por UUID, no el nombre del archivo |
| **Exposición de credenciales** | Cloudinary se configura del lado del servidor. No exponer `api_secret` al frontend |
| **Upload sin autenticación** | Endpoint protegido con `require_owner` (owner del store) |
| **Sobrescritura de imágenes** | Usar UUID como `public_id` para evitar colisiones |
| **Cliente malicioso** | Siempre revalidar en backend, nunca confiar solo en validación client-side |
