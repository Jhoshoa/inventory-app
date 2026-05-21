# Sprint 5 Web Assisted Inventory Import Plan

Fecha: 2026-05-21

## Objetivo

Implementar en la web el flujo de importacion asistida por foto/OCR: subir una imagen de una hoja, lista o planilla impresa, revisar los items detectados, corregirlos, aprobar/rechazar filas y confirmar la importacion para crear productos reales con auditoria de stock. Este sprint debe mantener la regla principal del producto: OCR ayuda, pero nunca afecta inventario sin revision humana.

## Estado Actual Verificado

### Ya existe en `apps/web`

- App Router con rutas autenticadas bajo `/dashboard`.
- Auth con cookies httpOnly, proxy/API client y rutas dinamicas para sesion.
- Layout operativo con sidebar, header y componentes UI base.
- Productos completos: listado, detalle, crear/editar, ajuste de stock y movimientos por producto.
- POS, ventas, detalle y anulacion.
- Reportes, stock movements globales, exports CSV y settings ligero.
- Permisos frontend `owner/cashier` para acciones administrativas.
- Suite de validacion web: `typecheck`, `lint`, `test`, `build`, `test:e2e`.

### Ya existe en backend

- `POST /api/v1/inventory-imports/from-photo`
- `GET /api/v1/inventory-imports?status=&limit=&offset=`
- `GET /api/v1/inventory-imports/{import_id}`
- `PATCH /api/v1/inventory-imports/{import_id}/items/{item_id}`
- `POST /api/v1/inventory-imports/{import_id}/confirm`
- `POST /api/v1/inventory-imports/{import_id}/cancel`
- DTOs persistidos para imports e import items.
- Confirmacion owner-only via `require_owner`.
- Creacion de productos usando `CreateProductUseCase`.
- Stock movement `import` cuando el item confirmado trae stock inicial.

### Falta en web

- Ruta `/dashboard/imports`.
- Navegacion lateral hacia importaciones.
- Upload de foto multipart sin exponer token al navegador.
- Listado paginado de imports con filtro por estado.
- Vista detalle/revision de import.
- Edicion de items detectados por OCR.
- Acciones por item: aprobar, rechazar, volver a draft.
- Confirmacion de import con control de permisos owner.
- Cancelacion de import.
- Estados de error claros para OCR fallido, 403, 409 y validaciones 422.
- Tests unitarios/componentes/E2E del flujo de imports.

## Skills Aplicados

- `next-best-practices`: App Router, Server Components para listado/detalle, Server Actions para mutaciones, Route Handlers cuando convenga para multipart, manejo de cookies async y rutas dinamicas.
- `vercel-react-best-practices`: evitar waterfalls, mantener formularios de revision acotados, no cargar OCR/upload hasta que se use, tablas paginadas y componentes cliente pequenos.
- `typescript-advanced-types`: DTOs estrictos, estados discriminados de import/item, parsers de search params, validacion tipada de filas revisables y action states seguros.

## Alcance Incluido

- Agregar navegacion `Importaciones`.
- Crear `/dashboard/imports`.
- Crear `/dashboard/imports/[importId]`.
- Subir foto desde web con validacion de tipo/tamano.
- Listar imports con filtro por estado y paginacion.
- Mostrar detalle: metadata, estado, raw text, source photo URL si existe e items.
- Editar item detectado.
- Aprobar/rechazar items individualmente.
- Acciones bulk pragmaticas:
  - aprobar todos los drafts validos.
  - rechazar todos los items seleccionados o invalidos.
- Confirmar importacion como owner.
- Cancelar importacion en estados permitidos.
- Mostrar links a productos creados cuando item queda `imported`.
- Tests unitarios, componentes y E2E mockeados.

## Fuera de Alcance

- Matching avanzado contra productos existentes.
- Merge/update de productos existentes.
- OCR en navegador.
- Camara web en vivo.
- Importar CSV/Excel.
- Background polling avanzado para imports `processing`.
- Drag-and-drop complejo con reorder.
- Edicion inline con virtualizacion.
- Gestion completa de usuarios/roles.

## Estructura Objetivo

```text
apps/web/
  app/(app)/dashboard/imports/
    page.tsx
    loading.tsx
    [importId]/page.tsx
  app/api/inventory-imports/from-photo/route.ts
  src/features/imports/
    api.ts
    actions.ts
    schemas.ts
    types.ts
    components/
      ImportUploadPanel.tsx
      ImportStatusBadge.tsx
      ImportFilters.tsx
      ImportsTable.tsx
      ImportDetailHeader.tsx
      ImportReviewTable.tsx
      ImportItemEditor.tsx
      ImportRawTextPanel.tsx
      ImportConfirmPanel.tsx
      ImportCancelDialog.tsx
```

Decision recomendada: usar `src/features/imports/actions.ts` para editar, aprobar/rechazar, confirmar y cancelar porque las mutaciones necesitan cookies httpOnly y revalidacion. Para `from-photo`, usar un Route Handler interno o Server Action con `FormData`; recomiendo Route Handler interno si queremos progreso/errores desde un Client Component sin acoplar el formulario a una accion de servidor.

## Contratos Backend Reales

### Crear Import Desde Foto

```http
POST /api/v1/inventory-imports/from-photo
Content-Type: multipart/form-data
```

Campo:

```text
file: UploadFile
```

Respuesta:

```ts
interface InventoryImport {
  id: string;
  status: InventoryImportStatus;
  source_filename: string | null;
  source_content_type: string | null;
  source_photo_url: string | null;
  raw_text: string | null;
  error_message: string | null;
  items_count: number;
  items: InventoryImportItem[];
}
```

### Listar Imports

```http
GET /api/v1/inventory-imports?status=needs_review&limit=20&offset=0
```

Respuesta:

```ts
interface InventoryImportListResponse {
  items: InventoryImport[];
  total: number;
  limit: number;
  offset: number;
}
```

### Obtener Detalle

```http
GET /api/v1/inventory-imports/{import_id}
```

Incluye items.

### Actualizar Item

```http
PATCH /api/v1/inventory-imports/{import_id}/items/{item_id}
```

Payload:

```ts
interface UpdateInventoryImportItemPayload {
  status?: InventoryImportItemStatus;
  name?: string;
  category?: string | null;
  sku?: string | null;
  unit?: string;
  price?: string;
  cost_price?: string | null;
  stock?: number;
  min_stock?: number;
}
```

Respuesta: `InventoryImport` actualizado.

### Confirmar Import

```http
POST /api/v1/inventory-imports/{import_id}/confirm
```

Respuesta:

```ts
interface ConfirmInventoryImportResponse {
  import_id: string;
  status: string;
  created_products: number;
  failed_items: number;
}
```

Regla: requiere owner.

### Cancelar Import

```http
POST /api/v1/inventory-imports/{import_id}/cancel
```

Respuesta: `InventoryImport` actualizado.

## Tipos Frontend

```ts
type InventoryImportStatus =
  | "pending"
  | "processing"
  | "needs_review"
  | "confirmed"
  | "failed"
  | "cancelled";

type InventoryImportItemStatus =
  | "draft"
  | "approved"
  | "rejected"
  | "imported"
  | "failed";
```

Estados UI recomendados:

```ts
type UploadState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "uploading"; filename: string }
  | { status: "success"; importId: string }
  | { status: "error"; message: string };
```

## UX y Pantallas

### `/dashboard/imports`

Objetivo: entrada principal a importaciones.

Contenido:

- Header: `Importaciones`, descripcion corta y accion de subida.
- `ImportUploadPanel` con selector de archivo.
- Filtros por estado:
  - Todos.
  - En revision.
  - Confirmadas.
  - Fallidas.
  - Canceladas.
- Tabla paginada:
  - Fecha.
  - Archivo.
  - Estado.
  - Items.
  - Error si aplica.
  - Acciones: revisar/ver.

Estados:

- Loading con skeleton estable.
- Empty general: invitar a subir primera foto.
- Empty por filtro: limpiar filtro.
- Error: retry.
- Upload error: tipo/tamano/backend.

### `/dashboard/imports/[importId]`

Objetivo: revision humana y confirmacion.

Contenido:

- Header con estado, archivo, conteo y acciones.
- Resumen:
  - total items.
  - drafts.
  - approved.
  - rejected.
  - imported/failed.
- Panel opcional de raw text colapsable.
- Tabla de items:
  - fila OCR.
  - nombre.
  - categoria.
  - SKU.
  - unidad.
  - precio.
  - costo.
  - stock.
  - minimo.
  - confianza.
  - estado.
  - acciones.
- Editor por item en dialog o row expansion.
- Confirm panel:
  - muestra cuantos items aprobados se crearan.
  - deshabilitado si no hay aprobados.
  - deshabilitado para cashier con mensaje owner-only.

Estados:

- `needs_review`: editable.
- `confirmed`: solo lectura, mostrar productos creados.
- `failed`: mostrar error y raw text si existe.
- `cancelled`: solo lectura.
- `pending/processing`: mostrar estado informativo y refresh manual.

## Patrones de Implementacion

### Server Components por defecto

- `page.tsx` de listado y detalle deben cargar desde servidor con token de cookie.
- Client Components solo para upload, filtros, dialogs y formularios por item.
- Mantener `dynamic = "force-dynamic"` heredado del layout autenticado.

### Upload

Opciones:

1. Client Component `ImportUploadPanel` hace `fetch("/api/inventory-imports/from-photo", { method: "POST", body: FormData })`.
2. Route Handler interno lee `getAuthToken()`, reenvia `multipart/form-data` al backend y conserva errores.

Recomendacion: opcion 1 + Route Handler interno. Razones:

- Permite estado de subida en cliente.
- Mantiene access token en cookie httpOnly.
- Evita exponer `BACKEND_API_URL` al navegador.
- Permite validar tamano/tipo antes de enviar.

Validaciones iniciales:

- Aceptar `image/jpeg`, `image/png`, `image/webp`.
- Tamano maximo recomendado: 8 MB.
- Mostrar mensaje claro si OCR devuelve import `failed`.

### Revision de Items

- Usar Server Actions para `updateImportItemAction`, `approveImportItemAction`, `rejectImportItemAction`, `confirmImportAction`, `cancelImportAction`.
- Cada accion revalida `/dashboard/imports` y `/dashboard/imports/{id}`.
- Validar cliente y servidor:
  - `name` requerido para aprobar.
  - `price >= 0`.
  - `stock >= 0`.
  - `min_stock >= 0`.
  - `unit` requerido.
- Backend sigue siendo autoridad para 422/403/409.

### Search Params

Listado:

```text
/dashboard/imports?status=needs_review&limit=20&offset=0
```

Parsear con defaults estrictos:

- `status`: `all`.
- `limit`: 20, max 100.
- `offset`: 0.

### Permisos

Lectura y revision:

- Usuario autenticado.

Confirmacion:

- Owner.
- UI debe mostrar accion deshabilitada para cashier.
- Si backend responde 403, mostrar error visible.

Cancelar:

- Permitido para usuario autenticado segun backend actual.
- UI debe bloquear si status es `confirmed`.

### Performance

- No cargar librerias de OCR ni procesamiento en browser.
- No usar base64 preview para imagenes grandes si `source_photo_url` existe.
- Tabla de items puede ser normal para v1. Si se detectan imports con cientos de filas, agregar paginacion por items en backend futuro.
- Usar componentes memoizados solo si hay evidencia de renders costosos.
- Bulk approve debe operar de forma pragmatica. Si no hay endpoint bulk, ejecutar acciones secuenciales con feedback; preferible planificar endpoint bulk futuro si duele.

## Componentes Necesarios

- `ImportUploadPanel`: selector de archivo, validacion y upload.
- `ImportStatusBadge`: estados de import.
- `ImportFilters`: filtro por estado via URL.
- `ImportsTable`: listado paginado.
- `ImportDetailHeader`: metadata y acciones principales.
- `ImportRawTextPanel`: raw OCR colapsable.
- `ImportReviewTable`: tabla de items.
- `ImportItemEditor`: dialog/form para corregir item.
- `ImportConfirmPanel`: resumen de aprobados y confirmacion owner-only.
- `ImportCancelDialog`: confirmacion de cancelacion.

Usar iconos lucide:

- `Upload` para subir.
- `FileImage` para foto.
- `Check` para aprobar.
- `X` para rechazar.
- `ShieldAlert` para owner-only.
- `RefreshCw` para processing/refresh.

## Implementacion por Pasos

### 1. Navegacion y rutas

- Agregar item `Importaciones` al sidebar.
- Crear `/dashboard/imports`.
- Crear `/dashboard/imports/[importId]`.
- Agregar `loading.tsx` para listado.

### 2. Tipos, schemas y API

- Crear `src/features/imports/types.ts`.
- Crear `src/features/imports/schemas.ts`.
- Crear `src/features/imports/api.ts`.
- Parsear search params.
- Normalizar labels de estado.
- Crear validadores de item y upload.

### 3. Upload multipart

- Crear `app/api/inventory-imports/from-photo/route.ts`.
- Reenviar `FormData` al backend con token httpOnly.
- Crear `ImportUploadPanel`.
- Redirigir a `/dashboard/imports/{id}` al terminar.

### 4. Listado de imports

- Implementar filtros por estado.
- Implementar tabla y paginacion.
- Mostrar errores y empty states.

### 5. Detalle y revision

- Renderizar metadata y raw text.
- Renderizar tabla de items.
- Implementar editor de item.
- Implementar approve/reject.
- Revalidar despues de cada accion.

### 6. Confirmar y cancelar

- Implementar `confirmImportAction`.
- Implementar `cancelImportAction`.
- Usar `canConfirmImport(role)` o extender `permissions.ts`.
- Mostrar 403/409/422 con mensajes claros.
- Redirigir o refrescar detalle luego de confirmar.

### 7. Tests y verificacion

- Unit tests de schemas y permisos.
- Component tests de upload/listado/revision.
- Route handler tests de upload proxy.
- E2E mockeado del flujo principal.

## Tests Requeridos

### Unit/API

1. `parseImportSearchParams_applies_defaults`
2. `parseImportSearchParams_rejects_invalid_status`
3. `buildImportQueryString_serializes_status_limit_offset`
4. `validateImportUpload_rejects_invalid_type`
5. `validateImportUpload_rejects_large_file`
6. `validateImportItem_rejects_approved_without_name`
7. `validateImportItem_rejects_negative_price_stock_min_stock`
8. `importStatusLabel_maps_known_statuses`
9. `itemStatusLabel_maps_known_statuses`
10. `permissions_owner_can_confirm_import`
11. `permissions_cashier_cannot_confirm_import`

### Componentes

12. `ImportUploadPanel_rejects_non_image_file`
13. `ImportUploadPanel_shows_upload_error`
14. `ImportsTable_renders_empty_state`
15. `ImportsTable_renders_status_badges`
16. `ImportFilters_updates_search_params`
17. `ImportReviewTable_renders_items_and_confidence`
18. `ImportItemEditor_shows_field_errors`
19. `ImportConfirmPanel_blocks_without_approved_items`
20. `ImportConfirmPanel_disables_for_cashier`
21. `ImportCancelDialog_blocks_confirmed_import`

### Route Handlers / Actions

22. `from_photo_route_requires_session_token`
23. `from_photo_route_forwards_multipart_file`
24. `updateImportItemAction_maps_validation_errors`
25. `confirmImportAction_maps_forbidden`
26. `cancelImportAction_maps_conflict`

### E2E

27. `imports_page_renders_empty_state`
28. `upload_photo_creates_import_and_redirects_to_review`
29. `import_review_edits_and_approves_item`
30. `cashier_cannot_confirm_import`
31. `owner_confirms_import_and_sees_created_count`
32. `cancel_import_requires_confirmation`

Usar mocks de route handlers/backend para E2E; no depender de OCR real en Playwright.

## Comandos de Validacion

```powershell
cd apps/web
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

Validacion opcional con backend real:

```powershell
cd apps/backend
py -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

Luego:

```powershell
cd apps/web
corepack pnpm dev
```

Validar manualmente:

- `/dashboard/imports`
- subir imagen fake o pequena.
- revisar item.
- aprobar/rechazar item.
- confirmar como owner.
- intentar confirmar como cashier.
- cancelar import no confirmado.

## Criterios de Aceptacion

- Sidebar incluye `Importaciones`.
- `/dashboard/imports` lista imports paginados y filtrables por estado.
- El usuario puede subir una foto y llegar al detalle del import creado.
- El detalle muestra estado, archivo, raw OCR y items detectados.
- Items en `needs_review` se pueden editar, aprobar y rechazar.
- Confirmar import requiere owner y al menos un item aprobado.
- Confirmar crea productos via backend y muestra conteo de productos creados.
- Imports confirmados quedan en modo solo lectura.
- Imports fallidos muestran `error_message`.
- Cancelar import pide confirmacion y no se ofrece para `confirmed`.
- 401/403/409/422/network errors tienen feedback visible.
- `typecheck`, `lint`, `test`, `build` y `test:e2e` pasan.

## Riesgos y Decisiones

- **OCR impreciso:** la UI debe asumir datos malos. Revision humana y validacion de campos son parte central del sprint.
- **No hay endpoint bulk:** acciones masivas pueden esperar o ejecutarse secuencialmente. Si se vuelve lento, planificar endpoint bulk.
- **Confirm owner-only:** cashier puede revisar, pero no confirmar. Esta distincion debe ser visible.
- **Productos duplicados:** Sprint 5 crea productos nuevos. Matching/merge por SKU o nombre queda fuera.
- **Items sin paginacion propia:** detalle trae todos los items. Aceptable para v1; si OCR produce cientos de filas, se planifica paginacion backend.
- **Upload grande:** validar tamano antes de enviar y mostrar error claro. Compresion client-side queda fuera.
- **Processing async:** backend actual puede responder `processing/pending`; UI debe mostrar refresh manual. Polling automatico queda fuera.
- **Imagen remota:** si `source_photo_url` existe, usar `next/image` solo si el dominio esta configurado; de lo contrario mostrar link externo o metadata para evitar romper build.

## Resultado Esperado

Al cerrar Sprint 5, la web permite cargar inventario mas rapido desde fotos sin sacrificar control: OCR produce borradores, el usuario corrige y aprueba, owner confirma, y el backend crea productos con auditoria de stock. Esto completa el flujo administrativo principal de v1 antes de pasar a hardening, accesibilidad, performance, observabilidad y preparacion de deploy.
