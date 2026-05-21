# Sprint 4 Web Reports, Stock Movements, Exports and Permissions Plan

Fecha: 2026-05-20

## Objetivo

Convertir las rutas administrativas pendientes de la web en herramientas operativas reales: reportes de ventas por rango, historial global de movimientos de stock, exportes CSV y visibilidad clara de permisos por rol. Este sprint debe cerrar el ciclo posterior a POS: vender, corregir, auditar y extraer datos basicos para administracion.

## Estado Actual Verificado

### Ya existe en `apps/web`

- Fundacion Next.js 15 con App Router, rutas protegidas, cookies httpOnly y proxy/API client.
- Dashboard autenticado.
- Productos completos con listado, filtros, crear/editar, detalle y movimientos por producto.
- POS y ventas con carrito, historial, detalle y anulacion.
- Componentes UI base: tablas, botones, badges, dialogs, inputs, textarea, pagination, quantity stepper y empty states.
- Tests unitarios/componentes/E2E para auth, productos, POS y ventas.
- Ruta `/dashboard/reports` existe, pero sigue como placeholder.
- Ruta `/dashboard/settings` existe, pero sigue como placeholder.
- Sesion web expone `role`, con fallback `cashier`.

### Ya existe en backend

- `GET /api/v1/reports/sales`
- `GET /api/v1/stock-movements`
- `GET /api/v1/products/{product_id}/stock-movements`
- `GET /api/v1/exports/products.csv`
- `GET /api/v1/exports/sales.csv`
- `GET /api/v1/exports/stock-movements.csv`
- Exports protegidos con `require_owner`.
- Stock movements protegidos para usuario activo.
- Anulacion de ventas ya integrada con `POST /api/v1/sales/{sale_id}/void`.

### Falta

- Pantalla real de reportes.
- Filtros de fecha reutilizables.
- Vista global de movimientos de stock.
- Descarga CSV desde la web usando cookies httpOnly.
- Estados 403 visibles para roles sin permiso.
- Helpers de permisos en frontend para owner/cashier.
- Tests especificos para reportes, movimientos, exportes y permisos.

## Skills Aplicados

- `next-best-practices`: Server Components para carga inicial, Search Params async, Route Handlers para descargas protegidas, manejo de `forbidden` y errores.
- `vercel-react-best-practices`: fetches paralelos en reportes, evitar waterfalls, componentes cliente pequenos para filtros, descargas bajo demanda y tablas estables.
- `typescript-advanced-types`: DTOs estrictos para reportes/movimientos, permisos tipados, estados discriminados para exportes y validacion de filtros.

## Alcance Incluido

- Completar `/dashboard/reports`.
- Agregar `/dashboard/reports/stock-movements` o una pestana equivalente dentro de reportes.
- Crear filtros por rango de fecha con URL como fuente de verdad.
- Consumir `GET /reports/sales?from=&to=`.
- Consumir `GET /stock-movements?product_id=&type=&from=&to=&limit=&offset=`.
- Implementar descargas:
  - Productos CSV.
  - Ventas CSV por rango.
  - Movimientos CSV por rango.
- Agregar route handlers internos para descargar CSV sin exponer tokens al navegador.
- Agregar helpers de permiso `isOwner`, `canExport`, `canVoidSale` y `canManageSettings`.
- Mostrar UX clara para `cashier` cuando una accion requiere owner.
- Preparar `/dashboard/settings` con resumen de sesion, tienda y rol, sin implementar gestion completa de usuarios todavia.

## Fuera de Alcance

- Graficos complejos con libreria pesada.
- Export PDF.
- Reportes contables/fiscales.
- Jobs background para exportes grandes.
- Gestion completa de usuarios, invitaciones o cambio de roles.
- Offline web/IndexedDB.
- Camara QR o escaneo fisico.

## Estructura Objetivo

```text
apps/web/
  app/(app)/dashboard/reports/
    page.tsx
    loading.tsx
    stock-movements/page.tsx
  app/(app)/dashboard/settings/
    page.tsx
  app/api/exports/
    products/route.ts
    sales/route.ts
    stock-movements/route.ts
  src/features/reports/
    api.ts
    schemas.ts
    types.ts
    components/
      DateRangeFilter.tsx
      ExportPanel.tsx
      SalesReportSummary.tsx
      PaymentMethodBreakdown.tsx
      TopProductsTable.tsx
      StockMovementsTable.tsx
      StockMovementFilters.tsx
  src/features/settings/
    components/
      SettingsOverview.tsx
      PermissionMatrix.tsx
  src/lib/auth/
    permissions.ts
```

Decision recomendada: mantener `/dashboard/reports` para resumen de ventas y exportes, y crear `/dashboard/reports/stock-movements` para auditoria global. Esto evita sobrecargar una sola pagina y mantiene URLs compartibles.

## Contratos Backend

### Reporte de Ventas

```http
GET /api/v1/reports/sales?from=2026-05-01T00:00:00.000Z&to=2026-05-20T23:59:59.999Z
```

Respuesta:

```ts
interface SalesReport {
  from_date: string;
  to_date: string;
  total_sales: string;
  sales_count: number;
  items_count: number;
  by_payment_method: Array<{
    payment_method: string;
    total: string;
    count: number;
  }>;
  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    total: string;
  }>;
}
```

### Movimientos Globales de Stock

```http
GET /api/v1/stock-movements?product_id=&type=&from=&to=&limit=50&offset=0
```

Respuesta:

```ts
interface StockMovementListResponse {
  items: StockMovement[];
  total: number;
  limit: number;
  offset: number;
}

interface StockMovement {
  id: string;
  product_id: string;
  sale_id: string | null;
  movement_type: string;
  quantity_delta: number;
  stock_after: number;
  reason: string | null;
  device_id: string | null;
  created_at: string;
}
```

Tipos esperados para filtros:

```ts
type StockMovementType =
  | "sale"
  | "sale_void"
  | "manual_adjustment"
  | "import"
  | "stock_movement";
```

### Exports CSV

```http
GET /api/v1/exports/products.csv
GET /api/v1/exports/sales.csv?from=&to=
GET /api/v1/exports/stock-movements.csv?from=&to=
```

Regla importante: estos endpoints requieren `owner`. La web debe mostrar acciones deshabilitadas o mensajes de permiso cuando `session.role !== "owner"`, pero debe seguir manejando 403 porque el backend es la autoridad.

## UX y Pantallas

### `/dashboard/reports`

Contenido:

- Header compacto con titulo, rango activo y acciones de export.
- Filtro de rango: hoy, ultimos 7 dias, ultimos 30 dias, personalizado.
- KPIs:
  - Total vendido.
  - Numero de ventas.
  - Items vendidos.
  - Ticket promedio.
- Desglose por metodo de pago.
- Top productos vendidos.
- Panel de exportes CSV.

Estados:

- Loading con skeleton estable.
- Empty cuando el rango no tiene ventas.
- Error con retry conservando query params.
- Forbidden solo para exportes, no para lectura de reportes si backend permite usuario activo.

### `/dashboard/reports/stock-movements`

Contenido:

- Filtros por fecha, tipo de movimiento y producto opcional.
- Tabla: fecha, tipo, producto/id, delta, stock resultante, razon, dispositivo, venta relacionada.
- Paginacion backend.
- Accion para exportar movimientos del rango.

Estados:

- Empty general: no hay movimientos registrados.
- Empty por filtro: limpiar filtros.
- Error: retry.
- Forbidden en export si no es owner.

### `/dashboard/settings`

Alcance Sprint 4:

- Mostrar datos de sesion: email, rol, tienda.
- Mostrar matriz simple de permisos:
  - Cashier: vender, consultar productos, consultar stock, ver reportes basicos.
  - Owner: todo lo anterior, anular ventas, exportar CSV, administrar usuarios.
- Mostrar empty/placeholder claro para gestion de usuarios futura.

No implementar aun:

- Crear usuarios.
- Cambiar roles.
- Invitar miembros.

## Patrones de Implementacion

### Server Components por defecto

Las paginas de reportes deben cargar datos desde servidor para usar cookies httpOnly y evitar exponer tokens. Los componentes cliente deben limitarse a:

- Filtros que actualizan URL.
- Botones de descarga.
- Controles de paginacion.

### Search Params como contrato de UI

Los filtros deben vivir en la URL:

```text
/dashboard/reports?range=30d&from=2026-04-21&to=2026-05-20
/dashboard/reports/stock-movements?type=sale_void&limit=50&offset=0
```

Beneficios:

- Pantallas compartibles.
- Pruebas mas simples.
- Back/forward del navegador funciona.
- Server Components reciben el estado completo.

### Descarga CSV con Route Handlers internos

Crear route handlers bajo `app/api/exports/*` que:

1. Lean token con `getAuthToken()`.
2. Llamen al backend real.
3. Reenvien `content-type` y `content-disposition`.
4. Devuelvan 403 normalizado si el backend rechaza.

Evitar descargar CSV directamente desde el navegador contra FastAPI, porque el token esta en cookie httpOnly y no debe pasar a `localStorage`.

### Permisos visibles, seguridad en backend

Agregar helpers puros:

```ts
export function isOwner(role: UserRole | undefined): boolean;
export function canExport(role: UserRole | undefined): boolean;
export function canVoidSale(role: UserRole | undefined): boolean;
export function canManageSettings(role: UserRole | undefined): boolean;
```

Uso:

- UI owner: botones activos.
- UI cashier: botones deshabilitados con texto claro.
- Backend 403: mostrar `No tienes permiso para esta accion`.

No ocultar por completo las capacidades administrativas; es mejor que el usuario entienda que existen y requieren owner.

### Performance

- Fetch del reporte y sesion en paralelo cuando sea posible.
- Fetch de movimientos separado de reporte para no bloquear el resumen.
- Evitar librerias de charts en este sprint. Usar tablas, barras simples con CSS y `SummaryRow`.
- No cargar exports hasta que el usuario haga click.
- Mantener tablas paginadas, sin virtualizacion por ahora.

## Componentes UI Necesarios

- `DateRangeFilter`: presets y rango manual.
- `ExportPanel`: acciones CSV con permisos y estado de descarga.
- `SalesReportSummary`: KPIs del rango.
- `PaymentMethodBreakdown`: tabla o barras CSS.
- `TopProductsTable`.
- `StockMovementFilters`.
- `StockMovementsTable`.
- `PermissionMatrix`.

Si hace falta un control tipo tabs para navegar entre `Resumen` y `Movimientos`, implementarlo como links visibles, no como estado local oculto, para conservar URLs.

## Implementacion por Pasos

### 1. Tipos, schemas y API

- Crear `src/features/reports/types.ts`.
- Crear validadores de search params en `schemas.ts`.
- Crear `getSalesReport(params)`.
- Crear `getStockMovements(params)`.
- Agregar fallback controlado solo para `network_error` si se necesita mantener dev sin backend, pero no ocultar errores reales 401/403/500.

### 2. Permisos frontend

- Crear `src/lib/auth/permissions.ts`.
- Agregar tests unitarios.
- Usar permisos en ventas/anulacion si hay deuda pendiente del Sprint 3.
- Usar permisos en `ExportPanel` y `SettingsOverview`.

### 3. Reporte de ventas

- Reemplazar placeholder de `/dashboard/reports`.
- Parsear `searchParams`.
- Cargar `session` y `salesReport`.
- Renderizar KPIs, payment methods y top products.
- Agregar empty/error/loading.

### 4. Movimientos globales

- Crear `/dashboard/reports/stock-movements`.
- Implementar filtros por URL.
- Implementar tabla y paginacion.
- Formatear tipos de movimiento:
  - `sale`: Venta.
  - `sale_void`: Anulacion.
  - `manual_adjustment`: Ajuste manual.
  - `import`: Importacion.
  - `stock_movement`: Movimiento.

### 5. Exports CSV

- Crear route handlers internos:
  - `/api/exports/products`
  - `/api/exports/sales`
  - `/api/exports/stock-movements`
- Crear botones de descarga en `ExportPanel`.
- Mantener rango de ventas/movimientos en query string.
- Manejar 403, network error y descarga exitosa.

### 6. Settings ligero

- Reemplazar placeholder con resumen de sesion y permisos.
- Dejar seccion de usuarios como fuera de alcance con estado informativo.
- No crear APIs nuevas.

### 7. Tests y verificacion

- Cubrir helpers, parsers, componentes y flujos E2E.
- Ejecutar comandos completos antes de cerrar.

## Tests Requeridos

### Unit/API

1. `parseReportSearchParams_applies_default_30_day_range`
2. `parseReportSearchParams_rejects_invalid_dates`
3. `parseStockMovementSearchParams_applies_limit_offset_defaults`
4. `buildReportQueryString_serializes_from_to`
5. `permissions_owner_can_export_and_void`
6. `permissions_cashier_cannot_export_or_manage_settings`
7. `reportsApi_normalizes_sales_report`
8. `stockMovementsApi_normalizes_paginated_response`

### Componentes

9. `DateRangeFilter_updates_search_params`
10. `SalesReportSummary_renders_totals_and_average_ticket`
11. `PaymentMethodBreakdown_renders_empty_state`
12. `TopProductsTable_renders_ranked_products`
13. `StockMovementsTable_formats_positive_and_negative_deltas`
14. `StockMovementFilters_updates_type_and_dates`
15. `ExportPanel_disables_owner_actions_for_cashier`
16. `ExportPanel_shows_forbidden_error`
17. `SettingsOverview_renders_session_role`
18. `PermissionMatrix_renders_owner_and_cashier_capabilities`

### Route Handlers

19. `export_products_route_requires_session_token`
20. `export_sales_route_forwards_date_range`
21. `export_stock_movements_route_preserves_csv_headers`
22. `export_route_returns_403_message`

### E2E

23. `reports_page_renders_sales_summary`
24. `reports_date_filter_updates_url`
25. `reports_cashier_cannot_export_csv`
26. `reports_owner_downloads_sales_csv`
27. `stock_movements_page_filters_by_type`
28. `settings_page_shows_current_role_permissions`

Usar mocks de Route Handlers/backend en Playwright cuando no sea necesario levantar FastAPI real.

## Comandos de Validacion

```powershell
cd apps/web
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
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

- `/dashboard/reports`
- `/dashboard/reports?range=7d`
- `/dashboard/reports/stock-movements`
- `/dashboard/settings`
- Descarga CSV como owner.
- Error 403 o accion bloqueada como cashier.

## Criterios de Aceptacion

- `/dashboard/reports` deja de ser placeholder y muestra metricas reales por rango.
- Rango de fecha se refleja en URL y se envia al backend.
- Reporte muestra total vendido, cantidad de ventas, items, ticket promedio, metodos de pago y top productos.
- `/dashboard/reports/stock-movements` lista movimientos globales con filtros y paginacion.
- Exports CSV funcionan desde la web sin exponer tokens al navegador.
- Cashier no puede exportar y recibe feedback claro.
- Owner puede descargar productos, ventas y movimientos CSV.
- `/dashboard/settings` muestra rol actual y matriz de permisos v1.
- 401/403/500/network errors tienen estados visibles.
- `typecheck`, `lint`, `test`, `test:e2e` y `build` pasan.

## Riesgos y Decisiones

- **Rango maximo de 90 dias:** backend lo valida en exports. La UI debe evitar rangos excesivos, pero seguir mostrando el error del backend si ocurre.
- **Productos en stock movements:** el endpoint global devuelve `product_id`, no nombre. Para Sprint 4, mostrar ID corto es aceptable. Resolver nombres requeriria endpoint enriquecido o fetch adicional; no conviene introducir waterfall ahora.
- **Charts:** no agregar libreria pesada hasta que haya necesidad clara. Tablas y barras CSS son suficientes para v1.
- **Permisos en cliente:** ayudan a UX, no son seguridad. El backend decide siempre.
- **CSV con cookies httpOnly:** requiere route handlers internos. No usar `localStorage` ni exponer access token.
- **Settings:** mantenerlo liviano. La gestion real de usuarios debe planificarse en un sprint posterior porque toca backend, seguridad y UX de invitaciones.

## Resultado Esperado

Al cerrar Sprint 4, la web deja de ser solo operativa en venta/productos y pasa a ser administrable: el owner puede revisar resultados, auditar cambios de stock, exportar datos y entender permisos. Esto prepara Sprint 5 para importacion asistida/OCR o, si el negocio lo pide antes, gestion de usuarios y roles.
