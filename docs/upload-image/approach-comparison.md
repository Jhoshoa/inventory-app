# Comparación: Upload server-side vs directo a Cloudinary

## Enfoque A — Server-side (propuesto en el plan)

```
Frontend                    Backend                     Cloudinary
   │                          │                          │
   │  POST /products/{id}/photo│                         │
   │  FormData (file bytes)   │                          │
   │ ───────────────────────> │                          │
   │                          │  cloudinary.uploader.    │
   │                          │  upload(bytes)           │
   │                          │ ───────────────────────> │
   │                          │                          │
   │                          │ ◄──── secure_url ─────── │
   │                          │                          │
   │ ◄── { photo_url: url } ─│                          │
   │                          │                          │
```

**Ventajas:**

| Aspecto | Detalle |
|---------|---------|
| **Seguridad** | `api_secret` nunca sale del backend. Validación centralizada (magic bytes, tipo, tamaño) |
| **Validación** | Se puede rechazar el archivo antes de que llegue a Cloudinary |
| **Auditoría** | El backend tiene control total de cada upload (quién, cuándo, qué producto) |
| **Multi-tenant** | El backend verifica `store_id` antes de subir. Imposible que un store vea imágenes de otro |
| **Limpieza** | El backend puede eliminar la imagen anterior de Cloudinary automáticamente |
| **Rate limiting** | Fácil de implementar a nivel de API |

**Desventajas:**

| Aspecto | Detalle |
|---------|---------|
| **Ancho de banda** | El archivo viaja dos veces: usuario → VPS → Cloudinary. El VPS paga ancho de banda doble |
| **Latencia** | El usuario espera mientras el archivo sube al backend y luego a Cloudinary |
| **Carga en el VPS** | El servidor consume CPU/memoria para recibir, validar y reenviar el archivo |
| **Timeout de conexión** | Archivos grandes pueden exceder timeouts del reverse proxy (Nginx, etc.) |
| **Complejidad multipart** | El backend debe manejar multipart en un solo endpoint |

---

## Enfoque B — Directo a Cloudinary (upload firmado)

```
Frontend                     Cloudinary                 Backend
   │                            │                         │
   │  POST /products (JSON)     │                         │
   │  { name, price, ... }      │                         │
   │ ────────────────────────────────────────────────────> │
   │                            │                         │
   │ ◄──── { id: "uuid" } ─────│───────────────────────── │
   │                            │                         │
   │  POST /1/upload            │                         │
   │  (directo a Cloudinary)    │                         │
   │ ────────────────────────> │                          │
   │  ◄─── secure_url ──────── │                          │
   │                            │                         │
   │  PATCH /products/{id}      │                         │
   │  { photo_url: secure_url } │                         │
   │ ────────────────────────────────────────────────────> │
   │                            │                         │
```

**Ventajas:**

| Aspecto | Detalle |
|---------|---------|
| **Ancho de banda** | El archivo viaja directo del usuario a Cloudinary. El VPS no paga el peso de la imagen |
| **Latencia** | El usuario puede ver progreso de subida directa (menos saltos) |
| **Carga en el VPS** | Cero CPU/memoria para procesar archivos binarios |
| **Escalabilidad** | Cloudinary escala automáticamente. El backend no es cuello de botella |

**Desventajas:**

| Aspecto | Detalle |
|---------|---------|
| **Seguridad** | Se necesita exponer `api_key` al frontend. Si es unsigned upload, cualquiera puede subir archivos a tu Cloudinary sin autenticación |
| **Validación** | Cloudinary valida que sea imagen, pero no sabe de tu dominio (store_id, producto, etc.). No puedes validar ownership antes de subir |
| **Multi-tenant** | La subida ocurre antes de la verificación de `store_id`. Un atacante podría subir imágenes aunque no tenga permiso para editar productos |
| **Imágenes huérfanas** | Si el usuario sube la foto pero nunca hace PATCH, la imagen queda en Cloudinary sin referencia. Requiere limpieza periódica |
| **Complejidad de firma** | Para upload firmado (seguro), el backend debe generar un token firmado por cada upload. El frontend lo usa para autenticar la subida |
| **CORS** | Hay que configurar CORS en Cloudinary para permitir uploads desde tu dominio |

---

## Tabla comparativa

| Criterio | Server-side | Directo firmado | Directo unsigned |
|---|---|---|---|
| `api_secret` expuesto | ✅ No | ✅ No (solo firma temporal) | ❌ Requiere `upload_preset` público |
| Validación antes de subir | ✅ Completa (tipo, tamaño, store_id, magic bytes) | ❌ Solo después de subir | ❌ Solo después de subir |
| Control multi-tenant | ✅ Store_id verificado antes | ❌ Se sube primero, se verifica después | ❌ Idem |
| Límite de tamaño | ✅ 5 MB configurable | ✅ Se puede pasar param a firma | ❌ Solo el default de Cloudinary |
| Ancho de banda VPS | 🟡 Archivo pasa por el VPS | ✅ 0 ancho de banda extra | ✅ 0 ancho de banda extra |
| Latencia para el usuario | 🟡 Más lento (2 saltos) | ✅ Más rápido (1 salto) | ✅ Más rápido (1 salto) |
| Limpieza de huérfanas | ✅ Inmediata al reemplazar | 🟡 Tarea batch programada | 🟡 Tarea batch programada |
| Rate limiting | ✅ Control total | 🟡 Limitado por plan Cloudinary | 🟡 Sin control server-side |
| Complejidad de implementación | 🟡 Media (multipart + validación) | 🔴 Alta (firma + CORS + limpieza) | 🟡 Baja pero inseguro |
| Escalabilidad | 🟡 Cuello de botella en VPS | ✅ Cloudinary escala, VPS no procesa archivos | ✅ Idem |

---

## Decisión: Server-side upload (Enfoque A)

Para este proyecto, se elige **server-side upload** por las siguientes razones:

1. **Multi-tenant crítico**: cada `store_id` debe estar aislado. No queremos
   que un usuario pueda subir imágenes sin antes verificar que tiene permiso
   para editar ese producto.

2. **Validación centralizada**: el backend es el único punto donde se validan
   magic bytes, tamaño, tipo MIME. Con directo, un atacante podría subir archivos
   no-image a Cloudinary si encuentra el `upload_preset`.

3. **El VPS tiene suficiente ancho de banda**: las imágenes se redimensionan a
   800px de ancho por Cloudinary, pesan ≈100-300 KB. No es un costo significativo.

4. **Simplicidad de implementación**: no hay que configurar signed uploads,
   ni CORS en Cloudinary, ni tareas batch de limpieza.

5. **Consistencia con la arquitectura actual**: el backend ya tiene
   `IPhotoStorage` y `CloudinaryPhotoStorage`. Solo falta conectarlos.

### ¿Cuándo reconsiderar directo?

Si en el futuro:
- El VPS tiene problemas de ancho de banda o CPU
- Se necesitan subir imágenes de alta resolución (>10 MB)
- El número de uploads concurrentes crece significativamente (>100/minuto)

En ese caso, migrar a **directo firmado** sería el siguiente paso:
1. Backend genera token firmado (expira en 5 min)
2. Frontend sube directo a Cloudinary con el token
3. Cloudinary notifica al backend via webhook (`upload.php` en Cloudinary)
4. Backend actualiza `photo_url` al recibir el webhook
