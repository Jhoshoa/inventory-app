# Sprint 2: Store Day Date Filters and Operational Reporting Plan

Fecha: 2026-05-22

## Objetivo

Consolidar Dashboard, Ventas y Reportes bajo una misma regla de fechas operativas por tienda.

Sprint 1 dejo lista la base de jornada:

- La tienda se abre, cierra y reabre por dia operativo.
- `POST /sales` exige jornada abierta.
- Las ventas nuevas quedan asociadas a `business_day_id` y `business_date`.
- Existe timeline append-only en `store_business_day_events`.
- Dashboard muestra estado operativo.
- Ajustes administra abrir/cerrar/reabrir.
- POS se bloquea cuando la tienda esta cerrada.

Sprint 2 debe construir sobre esa base para que las pantallas principales respondan igual a preguntas como:

- Cuanto vendimos hoy segun la fecha local de la tienda?
- Que ventas pertenecen al dia seleccionado?
- Que muestra el dashboard del mes?
- Por que Reportes, Ventas y Dashboard muestran numeros distintos?
- Desde que fecha puede consultar el owner?

La meta principal es eliminar la ambiguedad de "hoy" y dejar un contrato unico de fechas de negocio.

## Skills Aplicados

- `fastapi-templates`: mantener Clean Architecture, use cases pequenos, DTOs explicitos, dependencias FastAPI limpias y errores HTTP consistentes.
- `next-best-practices`: usar Server Components para lectura, `searchParams` como fuente de filtros, Server Actions solo para mutaciones y fetches paralelos donde aplique.
- `supabase-postgres-best-practices`: consultar por indices compuestos, evitar rangos ambiguos, preparar queries por `store_id`, `business_date`, `created_at` y paginar resultados.

## Estado Actual Verificado

### Backend

Ya implementado:

- `store_business_days` con `unique(store_id, business_date)`.
- `store_business_day_events` con eventos `open`, `close`, `reopen`.
- `stores.timezone`.
- `stores.first_business_date`.
- `sales.business_day_id`.
- `sales.business_date`.
- `sales.created_by_user_id`.
- `GET /api/v1/store-day/current`.
- `GET /api/v1/store-day/current/events`.
- `POST /api/v1/store-day/open`.
- `POST /api/v1/store-day/close`.
- `POST /api/v1/store-day/reopen`.
- `POST /api/v1/sales` bloquea ventas sin jornada abierta.
- Los endpoints nuevos usan `store_id` del usuario autenticado y owner-only para mutaciones de jornada.

Pendiente:

- `GET /api/v1/sales` todavia lista ventas sin filtro operativo de fecha.
- `GET /api/v1/sales` no tiene paginacion.
- Dashboard todavia calcula "hoy" con `datetime.now(UTC).date()`.
- Dashboard no acepta `scope=today|month`.
- `latest_sales` del dashboard no esta limitado al rango actual.
- Reportes todavia aceptan `from` y `to` como `datetime`.
- Reportes siguen con default backend de ultimos 7 dias si no recibe fechas.
- Frontend de Reportes serializa fechas como datetimes UTC con `Z`.
- No hay un servicio unico de rangos locales por timezone.
- Ventas historicas previas a Sprint 1 pueden tener `business_date = null`.

### Web

Ya implementado:

- Dashboard muestra estado abierto/cerrado.
- Dashboard no administra la jornada directamente; redirige a Ajustes.
- Ajustes muestra acciones de jornada para owner.
- Ajustes muestra timeline de eventos.
- POS se bloquea si la tienda esta cerrada.
- Las acciones de jornada revalidan rutas relevantes y redirigen a Ajustes despues de mutar.

Pendiente:

- `/dashboard/sales` no tiene calendario.
- `/dashboard/sales` no usa default hoy local.
- `/dashboard/sales` no tiene paginacion.
- Dashboard no tiene selector `Hoy / Mes`.
- Reportes no envia fechas de negocio como `YYYY-MM-DD`.
- Reportes no esta alineado con la timezone de la tienda.
- Los inputs de fecha no usan `first_business_date` como minimo operativo.

## Alcance Sprint 2

### Incluido

1. Crear un servicio backend unico para rangos de fechas operativas.
2. Hacer que Ventas liste por default la fecha local de hoy.
3. Agregar filtro calendario en Ventas.
4. Agregar paginacion a Ventas.
5. Validar que Ventas no consulte antes de `first_business_date`.
6. Agregar `scope=today|month` al Dashboard.
7. Hacer que Dashboard use timezone de la tienda.
8. Filtrar `latest_sales` por el scope actual del Dashboard.
9. Corregir Reportes para aceptar fechas locales `YYYY-MM-DD`.
10. Mantener compatibilidad temporal con `from`/`to` en Reportes si hay consumidores existentes.
11. Agregar preset de mes actual en Reportes.
12. Backfill de `sales.business_date` para ventas historicas donde sea posible.
13. Agregar o ajustar indices para las consultas nuevas.
14. Agregar tests backend y web para rangos, filtros y permisos.

### Fuera de Alcance

- Cierre avanzado de caja.
- Conteo inicial/final de efectivo.
- Turnos por cashier.
- Gastos operativos del dia.
- Exportaciones avanzadas por jornada.
- Conciliacion offline/mobile.
- RBAC granular.
- Edicion manual de timezone desde UI.

Estos puntos dependen de tener primero fechas confiables y consistentes.

## Diseno Recomendado

### Principio Principal

El frontend envia fechas de negocio como `YYYY-MM-DD`.

El backend decide los boundaries reales en UTC usando `stores.timezone`.

Esto evita que el cliente fuerce `T00:00:00.000Z` y corte mal los dias para tiendas en LatAm.

### Servicio de Rangos Operativos

Crear un helper/use case de aplicacion, por ejemplo:

```text
BusinessDateRangeService
  today(store_timezone) -> BusinessDateRange
  month(store_timezone) -> BusinessDateRange
  custom(from_date, to_date, store_timezone) -> BusinessDateRange
  validate_min_date(from_date, first_business_date)
```

DTO sugerido:

```text
BusinessDateRange
  from_date: date
  to_date: date
  start_at_utc: datetime
  end_at_utc: datetime
  timezone: str
```

Reglas:

- `from_date` y `to_date` son fechas locales de negocio.
- `start_at_utc` es inicio del `from_date` local convertido a UTC.
- `end_at_utc` es final exclusivo del dia posterior a `to_date` local convertido a UTC.
- Las queries deben usar `created_at >= start_at_utc` y `created_at < end_at_utc`.
- Si existe `business_date`, preferir filtrar por `business_date` para ventas.
- Si se consulta historico con ventas antiguas sin `business_date`, aplicar estrategia de backfill antes de depender de filtros.

### Fecha Minima Operativa

Usar:

1. `stores.first_business_date` si existe.
2. Fecha local de la primera venta si hay ventas historicas.
3. Fecha local de `stores.created_at` como fallback.

Backend:

- Rechazar rangos antes de `first_business_date` con `422`.
- Mensaje sugerido: `La fecha consultada es anterior a la apertura operativa de la tienda`.

Web:

- Usar `min={first_business_date}` en inputs `date`.
- Si la URL trae una fecha menor al minimo, normalizar el link o mostrar estado de error claro.

## API Contract Propuesto

### Ventas

```http
GET /api/v1/sales?from_date=2026-05-22&to_date=2026-05-22&status=all&limit=50&offset=0
```

Parametros:

- `from_date`: `date`, opcional, default hoy local.
- `to_date`: `date`, opcional, default igual a `from_date`.
- `status`: `completed | voided | all`, default `all`.
- `limit`: default `50`, max `100`.
- `offset`: default `0`.

Respuesta:

```json
{
  "items": [],
  "total": 0,
  "limit": 50,
  "offset": 0,
  "from_date": "2026-05-22",
  "to_date": "2026-05-22",
  "timezone": "America/La_Paz",
  "first_business_date": "2026-05-21"
}
```

Notas:

- Siempre filtrar por `store_id` del usuario autenticado.
- `cashier` puede listar ventas de su tienda si esa capacidad ya existe en UI.
- No exponer ventas de otras tiendas.
- Orden default: `created_at desc`.

### Dashboard

```http
GET /api/v1/dashboard/summary?scope=today
GET /api/v1/dashboard/summary?scope=month
```

Opcional:

```http
GET /api/v1/dashboard/summary?from_date=2026-05-01&to_date=2026-05-31
```

Parametros:

- `scope`: `today | month`, default `today`.
- `from_date` y `to_date`: opcional para rango custom futuro.

Respuesta debe conservar los campos actuales y agregar metadata:

```json
{
  "today_sales_total": "120.00",
  "today_sales_count": 3,
  "low_stock_count": 2,
  "latest_sales": [],
  "scope": "today",
  "from_date": "2026-05-22",
  "to_date": "2026-05-22",
  "timezone": "America/La_Paz",
  "first_business_date": "2026-05-21"
}
```

Notas:

- Para `scope=today`, usar fecha local de tienda.
- Para `scope=month`, usar primer y ultimo dia del mes local.
- `latest_sales` debe estar filtrado por el mismo rango.
- Si los nombres `today_sales_total` y `today_sales_count` quedan confusos para `scope=month`, mantenerlos por compatibilidad y planear renombre posterior a `sales_total` y `sales_count`.

### Reportes

Nuevo contrato recomendado:

```http
GET /api/v1/reports/sales?from_date=2026-05-01&to_date=2026-05-31
```

Compatibilidad temporal:

```http
GET /api/v1/reports/sales?from=2026-05-01T00:00:00.000Z&to=2026-05-31T23:59:59.999Z
```

Reglas:

- Preferir `from_date` y `to_date` si vienen presentes.
- Mantener `from` y `to` solo durante transicion.
- Default backend recomendado para Reportes: mes actual local.
- Mantener limite maximo de 90 dias.
- Validar `from_date >= first_business_date`.

## Cambios Backend

### Nuevos Archivos Sugeridos

```text
apps/backend/src/application/services/business_date_range_service.py
apps/backend/tests/unit/application/services/test_business_date_range_service.py
```

Si el proyecto prefiere evitar una carpeta `services`, ubicarlo como helper de aplicacion:

```text
apps/backend/src/application/use_cases/date_ranges.py
```

### Archivos a Modificar

```text
apps/backend/src/domain/repositories/sale_repository.py
apps/backend/src/application/dto/sale_dto.py
apps/backend/src/application/use_cases/sales/list_sales.py
apps/backend/src/application/use_cases/dashboard/get_dashboard_summary.py
apps/backend/src/application/use_cases/reports/get_sales_report.py
apps/backend/src/infrastructure/database/repositories/sale_repository.py
apps/backend/src/presentation/api/v1/sales.py
apps/backend/src/presentation/api/v1/dashboard.py
apps/backend/src/presentation/api/v1/reports.py
apps/backend/src/infrastructure/database/alembic/versions/<next>_backfill_sales_business_dates.py
```

### Repositorio de Ventas

Extender contrato:

```text
list_by_store(
  store_id,
  from_date,
  to_date,
  status,
  limit,
  offset
) -> tuple[list[Sale], int]
```

Para ventas:

- Usar `SaleModel.store_id == store_id`.
- Usar `SaleModel.business_date >= from_date`.
- Usar `SaleModel.business_date <= to_date`.
- Aplicar status si no es `all`.
- Ordenar por `SaleModel.created_at.desc()`.
- Calcular `total` con los mismos filtros.

### Dashboard

Actualizar `GetDashboardSummaryUseCase` para recibir:

```text
store_id
scope
from_date
to_date
```

El use case debe:

- Obtener tienda para leer `timezone` y `first_business_date`.
- Construir rango local.
- Calcular totales con ese rango.
- Filtrar `latest_sales` por el mismo rango.
- Mantener low stock y exchange rates como estan.

### Reportes

Actualizar `GetSalesReportUseCase` para aceptar fechas locales:

```text
from_date: date | None
to_date: date | None
```

Transicion:

- Si vienen `from_date`/`to_date`, usar flujo nuevo.
- Si vienen `from`/`to`, mantener flujo viejo por compatibilidad.
- Cuando web ya no use `from`/`to`, documentar deprecacion interna.

### Migracion y Backfill

Crear migracion para ventas historicas con `business_date` null.

Objetivo:

- Poblar `sales.business_date` desde `sales.created_at` usando la timezone de la tienda.
- Mantener `business_day_id` null para ventas historicas si no hay jornada asociable.

En Postgres, la idea conceptual es:

```sql
UPDATE sales s
SET business_date = (s.created_at AT TIME ZONE st.timezone)::date
FROM stores st
WHERE s.store_id = st.id
  AND s.business_date IS NULL;
```

La migracion debe ser idempotente y compatible con SQLite/test DB si aplica.

### Indices

Ya existe un indice recomendado por Sprint 1:

```text
ix_sales_store_business_date_created_at(store_id, business_date, created_at)
```

Evaluar agregar si el filtro por status sera frecuente:

```text
ix_sales_store_business_date_status_created_at(store_id, business_date, status, created_at)
```

Para MVP, usar el indice existente si esta presente y medir antes de agregar otro indice.

## Cambios Web

### Ventas

Actualizar:

```text
apps/web/app/(app)/dashboard/sales/page.tsx
apps/web/src/features/sales/api.ts
apps/web/src/features/sales/types.ts
apps/web/src/features/sales/schemas.ts
```

Agregar:

```text
apps/web/src/features/sales/components/SalesDateFilter.tsx
```

Comportamiento:

- Default: fecha local de hoy enviada como `YYYY-MM-DD`.
- Filtro simple por fecha o rango.
- `min` del input: `first_business_date` devuelto por API.
- Paginacion con componente existente `Pagination`.
- Preservar filtros al cambiar de pagina.
- Resetear `offset=0` cuando cambia fecha o status.

### Dashboard

Actualizar:

```text
apps/web/app/(app)/dashboard/page.tsx
apps/web/src/features/dashboard/api.ts
apps/web/src/features/dashboard/types.ts
apps/web/src/features/dashboard/components/DashboardOverview.tsx
```

Agregar o integrar:

```text
apps/web/src/features/dashboard/components/DashboardScopeTabs.tsx
```

Comportamiento:

- Tabs o segmented control: `Hoy` y `Mes`.
- `scope=today` por default.
- El estado de tienda sigue visible.
- Las acciones de jornada siguen viviendo en Ajustes.
- Los links conservan solo parametros relevantes.

### Reportes

Actualizar:

```text
apps/web/src/features/reports/schemas.ts
apps/web/src/features/reports/api.ts
apps/web/src/features/reports/components/DateRangeFilter.tsx
apps/web/app/(app)/dashboard/reports/page.tsx
```

Comportamiento:

- Enviar `from_date=YYYY-MM-DD`.
- Enviar `to_date=YYYY-MM-DD`.
- No enviar `T00:00:00.000Z` para fechas de negocio.
- Agregar preset `month`.
- Default recomendado: mes actual local.
- Mantener `limit` y `offset` si Reportes ya los usa.

## Plan de Implementacion

1. Crear servicio de rangos operativos y tests unitarios.
2. Agregar migracion de backfill para `sales.business_date`.
3. Extender contrato y repositorio de ventas con filtros, total, limit y offset.
4. Actualizar `GET /api/v1/sales` con `from_date`, `to_date`, `status`, `limit`, `offset`.
5. Actualizar tipos y pagina de Ventas en web con calendario y paginacion.
6. Actualizar Dashboard backend con `scope=today|month` y timezone de tienda.
7. Actualizar Dashboard web con tabs `Hoy / Mes`.
8. Actualizar Reportes backend para fechas locales y compatibilidad con `from`/`to`.
9. Actualizar Reportes web para enviar `from_date`/`to_date` y preset `month`.
10. Agregar tests backend de integracion para no filtrar datos de otra tienda.
11. Agregar tests web para filtros, queries y render de estados.
12. Ejecutar validaciones completas.

## Pruebas Requeridas

### Backend

- `test_business_date_range_today_uses_store_timezone`
- `test_business_date_range_month_uses_store_timezone`
- `test_business_date_range_rejects_before_first_business_date`
- `test_sales_list_defaults_to_today_local_date`
- `test_sales_list_filters_by_business_date`
- `test_sales_list_filters_by_status`
- `test_sales_list_returns_total_limit_offset`
- `test_sales_list_does_not_leak_other_store_sales`
- `test_dashboard_today_uses_store_timezone`
- `test_dashboard_month_uses_local_month`
- `test_dashboard_latest_sales_are_scoped_to_range`
- `test_reports_accept_from_date_to_date`
- `test_reports_prefer_date_params_over_datetime_params`
- `test_reports_reject_range_over_90_days`
- `test_reports_reject_date_before_first_business_date`
- `test_backfill_sets_business_date_for_legacy_sales`

### Web

- `parseSalesSearchParams_defaults_to_today`
- `buildSalesApiQuery_sends_date_only_params`
- `SalesDateFilter_uses_first_business_date_as_min`
- `SalesDateFilter_resets_offset_when_filters_change`
- `SalesPage_renders_pagination_preserving_filters`
- `DashboardScopeTabs_renders_today_and_month`
- `DashboardPage_passes_scope_to_api`
- `buildDashboardSummaryQuery_defaults_to_today`
- `parseSalesReportSearchParams_supports_month_preset`
- `buildSalesReportApiQuery_sends_from_date_to_date_without_z`
- `DateRangeFilter_resets_offset_when_range_changes`

## Validacion Manual

Backend:

```bash
cd apps/backend
py -m alembic upgrade head
py -m pytest tests -q -p no:cacheprovider
py -m ruff check src tests --no-cache
```

Web:

```bash
cd apps/web
corepack pnpm typecheck
corepack pnpm test
corepack pnpm lint
corepack pnpm build
```

Manual funcional:

1. Entrar como owner.
2. Abrir tienda en Ajustes.
3. Crear ventas en POS.
4. Ver `/dashboard/sales` default hoy con esas ventas.
5. Cambiar fecha en Ventas y confirmar que no aparecen ventas fuera del rango.
6. Cerrar tienda.
7. Reabrir tienda y crear otra venta.
8. Confirmar que Ventas del mismo dia muestra todas las ventas de la jornada.
9. Ver Dashboard `Hoy`.
10. Cambiar Dashboard a `Mes`.
11. Ver Reportes con preset `Mes actual`.
12. Intentar consultar una fecha anterior a `first_business_date` y confirmar bloqueo.

## Criterios de Aceptacion

- Ventas abre por default en la fecha local de hoy.
- Ventas permite filtrar por calendario.
- Ventas no permite consultar antes de `first_business_date`.
- Ventas tiene paginacion y total.
- Ventas preserva `store_id` desde autenticacion y no filtra por parametro externo.
- Dashboard `Hoy` usa fecha local de tienda, no UTC crudo.
- Dashboard `Mes` usa el mes local de tienda.
- `latest_sales` del dashboard pertenece al mismo rango visible.
- Reportes envia y recibe fechas de negocio como `YYYY-MM-DD`.
- Reportes mantiene maximo de 90 dias.
- Reportes agrega preset `Mes actual`.
- Dashboard, Ventas y Reportes coinciden para el mismo dia/rango.
- Cashier no gana permisos administrativos nuevos.
- Owner mantiene control de apertura/cierre/reapertura desde Ajustes.
- Tests backend y web pasan.

## Riesgos y Decisiones

- **Timezone:** es el riesgo principal. La conversion debe estar centralizada en backend.
- **Ventas historicas:** si `business_date` queda null, los filtros de Ventas seran incompletos. Por eso el backfill entra en este sprint.
- **Compatibilidad Reportes:** cambiar de `from`/`to` datetime a `from_date`/`to_date` puede romper consumidores. Mantener ambos por ahora.
- **Nombres del Dashboard:** `today_sales_total` puede quedar semanticamente raro para `scope=month`. Mantenerlo por compatibilidad y planear renombre despues.
- **Performance:** offset pagination es suficiente para MVP. Cursor pagination puede esperar.
- **Eventos de jornada:** ya estan implementados; Sprint 2 no debe reimplementar eventos, solo apoyarse en ellos.

## Recomendacion Final

Sprint 2 debe enfocarse en consistencia operacional, no en features nuevas de caja.

El orden recomendado es:

1. Backend de rangos locales y backfill.
2. Ventas con calendario y paginacion.
3. Dashboard Hoy/Mes con el mismo servicio de rangos.
4. Reportes con fechas locales `YYYY-MM-DD`.
5. Tests cruzados para demostrar que Dashboard, Ventas y Reportes coinciden.

Despues de esto, la app queda lista para Sprint 3 con cierre avanzado: caja, gastos, arqueo, diferencias y reportes de cierre diario.
