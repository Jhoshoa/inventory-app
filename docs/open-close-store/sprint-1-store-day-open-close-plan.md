# Sprint 1: Store Day Open/Close Plan

Fecha: 2026-05-21

## Objetivo

Implementar la base operativa para abrir y cerrar la tienda por dia, con el backend como autoridad y el POS bloqueado cuando la tienda este cerrada.

Este sprint no intenta resolver todos los filtros historicos de Dashboard, Ventas y Reportes. La prioridad es crear una "jornada operativa" real para que las ventas nuevas queden asociadas a un dia de negocio y para que el owner pueda controlar cuando se permite vender.

## Skills Aplicados

- `fastapi-templates`: mantener Clean Architecture, use cases asincronos, repositorios explicitos, dependencias FastAPI y errores HTTP consistentes.
- `next-best-practices`: usar Server Components para lectura inicial, Server Actions para abrir/cerrar, `revalidatePath` despues de mutaciones y rutas existentes bajo `/dashboard`.
- `vercel-react-best-practices`: evitar waterfalls con fetches paralelos en Dashboard/POS y pasar props minimas a componentes cliente.

## Estado Actual del Codigo

### Backend

- No existe entidad, modelo ni tabla para jornada operativa.
- `stores` solo tiene datos basicos y timestamps; no tiene `timezone` ni `first_business_date`.
- `sales` no tiene `business_day_id`, `business_date` ni `created_by_user_id`.
- `CreateSaleUseCase` valida productos, stock y duplicados, pero no valida si la tienda esta abierta.
- `GET /api/v1/sales` devuelve todas las ventas de la tienda sin filtros ni paginacion.
- `GetDashboardSummaryUseCase` calcula "hoy" con UTC y no sabe de jornada operativa.
- Ya existe separacion de capas: `domain`, `application`, `infrastructure`, `presentation`.
- Ya existe control de roles `owner`/`cashier`; esto permite hacer open/close owner-only desde Sprint 1.

### Web

- `/dashboard` solo llama `getDashboardSummary()` y renderiza `DashboardOverview`.
- `/dashboard/pos` renderiza `PosWorkspace` sin consultar si la tienda esta abierta.
- `createSaleAction` manda `POST /sales` directamente y hoy solo maneja errores de API/stock.
- `/dashboard/sales` llama `listSales()` sin parametros y muestra todo el historial.
- Ya existen Server Actions y `revalidatePath` en POS, por lo que el patron esta listo para extenderse.
- Ya existe filtrado de UI por rol en navegacion y permisos, lo cual se puede reutilizar para mostrar botones solo al owner.

## Alcance Sprint 1

### Incluido

1. Crear tabla `store_business_days`.
2. Agregar configuracion minima en `stores`: `timezone` y `first_business_date`.
3. Agregar relacion de ventas con jornada: `business_day_id`, `business_date`, `created_by_user_id`.
4. Crear endpoints:
   - `GET /api/v1/store-day/current`
   - `POST /api/v1/store-day/open`
   - `POST /api/v1/store-day/close`
5. Permitir abrir/cerrar solo a `owner`.
6. Permitir que `cashier` consulte el estado, pero no abra/cierre.
7. Bloquear `POST /sales` si no hay jornada abierta.
8. Asociar cada venta nueva con la jornada abierta.
9. Mostrar estado de tienda en Dashboard.
10. Agregar botones abrir/cerrar para owner en Dashboard.
11. Bloquear POS cuando la tienda este cerrada.
12. Agregar pruebas backend y web para el flujo base.

### Fuera de Alcance

- Dashboard con tabs Hoy/Mes.
- Filtros calendario en Ventas.
- Refactor completo de Reportes para fechas locales.
- Paginacion de Ventas.
- Cierre avanzado de caja.
- Reapertura de jornada cerrada.
- Turnos por cashier.
- Resolucion de conflictos offline/mobile.

Estos puntos deben quedar para Sprint 2 y Sprint 3, porque dependen de tener primero una jornada confiable.

## Reglas de Negocio

### Apertura

- Solo `owner` puede abrir.
- Si ya existe una jornada `open` para la tienda, responder `409`.
- Si ya existe una jornada `closed` para la fecha local actual, no reabrir en Sprint 1; responder `409`.
- `business_date` se calcula en backend usando `store.timezone`.
- `opened_at` se guarda en UTC.
- Si `stores.first_business_date` es null, se fija con el primer `business_date`.

### Cierre

- Solo `owner` puede cerrar.
- Debe existir una jornada `open`; si no existe, responder `409`.
- Al cerrar:
  - `status = closed`
  - `closed_at = now UTC`
  - `closed_by_user_id = current_user.id`
  - guardar nota opcional si viene en payload
- Despues del cierre, `POST /sales` debe quedar bloqueado.

### Ventas

- `POST /sales` requiere jornada abierta.
- Si la tienda esta cerrada, responder `409` con un mensaje claro para UI:
  - `La tienda esta cerrada. Un owner debe abrir la jornada para vender.`
- Cada venta nueva debe guardar:
  - `business_day_id`
  - `business_date`
  - `created_by_user_id`
- Las ventas historicas existentes pueden quedar con esos campos en null despues de la migracion.

## Modelo de Datos

### Nueva Tabla: `store_business_days`

```text
id uuid primary key
store_id uuid not null references stores(id)
business_date date not null
status varchar(20) not null
opened_at timestamptz not null
closed_at timestamptz null
opened_by_user_id uuid not null references users(id)
closed_by_user_id uuid null references users(id)
opening_note varchar(255) null
closing_note varchar(255) null
sales_total numeric(12,2) null
sales_count int null
voided_sales_count int null
created_at timestamptz not null
updated_at timestamptz not null
```

Indices y restricciones:

```text
unique(store_id, business_date)
index(store_id, status)
index(store_id, business_date)
index(store_id, opened_at, closed_at)
```

### Cambios en `stores`

```text
timezone varchar(64) not null default 'America/La_Paz'
first_business_date date null
```

Decision recomendada: usar `America/La_Paz` como default porque la app ya maneja contexto BCB/Bolivia. Si la tienda real opera en otra zona, el campo queda listo para configurarse sin cambiar codigo.

### Cambios en `sales`

```text
business_day_id uuid null references store_business_days(id)
business_date date null
created_by_user_id uuid null references users(id)
```

Indices:

```text
index(store_id, business_date, created_at)
index(store_id, business_day_id)
```

## API Contract

### `GET /api/v1/store-day/current`

Autenticado: `owner` y `cashier`.

Respuesta cuando esta abierta:

```json
{
  "status": "open",
  "business_date": "2026-05-21",
  "opened_at": "2026-05-21T12:30:00Z",
  "closed_at": null,
  "opened_by_user_id": "uuid",
  "closed_by_user_id": null,
  "timezone": "America/La_Paz",
  "first_business_date": "2026-05-21"
}
```

Respuesta cuando esta cerrada:

```json
{
  "status": "closed",
  "business_date": "2026-05-21",
  "opened_at": null,
  "closed_at": null,
  "opened_by_user_id": null,
  "closed_by_user_id": null,
  "timezone": "America/La_Paz",
  "first_business_date": "2026-05-21"
}
```

### `POST /api/v1/store-day/open`

Owner-only.

Payload:

```json
{
  "opening_note": "Apertura normal"
}
```

### `POST /api/v1/store-day/close`

Owner-only.

Payload:

```json
{
  "closing_note": "Cierre sin novedades"
}
```

## Arquitectura Backend

### Nuevos Archivos

```text
apps/backend/src/domain/entities/store_business_day.py
apps/backend/src/domain/repositories/store_business_day_repository.py
apps/backend/src/application/dto/store_day_dto.py
apps/backend/src/application/use_cases/store_day/get_current_store_day.py
apps/backend/src/application/use_cases/store_day/open_store_day.py
apps/backend/src/application/use_cases/store_day/close_store_day.py
apps/backend/src/infrastructure/database/models/store_business_day_model.py
apps/backend/src/infrastructure/database/repositories/store_business_day_repository.py
apps/backend/src/presentation/api/v1/store_day.py
```

### Archivos a Modificar

```text
apps/backend/src/domain/entities/store.py
apps/backend/src/domain/entities/sale.py
apps/backend/src/domain/repositories/store_repository.py
apps/backend/src/domain/repositories/sale_repository.py
apps/backend/src/application/dto/sale_dto.py
apps/backend/src/application/use_cases/sales/create_sale.py
apps/backend/src/infrastructure/database/models/store_model.py
apps/backend/src/infrastructure/database/models/sale_model.py
apps/backend/src/infrastructure/database/repositories/store_repository.py
apps/backend/src/infrastructure/database/repositories/sale_repository.py
apps/backend/src/presentation/dependencies.py
apps/backend/src/presentation/api/v1/sales.py
apps/backend/src/presentation/api/v1/router.py
apps/backend/src/infrastructure/database/seed/dev_seed.py
apps/backend/src/infrastructure/database/alembic/versions/<next>_add_store_business_days.py
```

### Use Cases

`GetCurrentStoreDayUseCase`

- Obtiene store.
- Calcula fecha local actual usando `ZoneInfo(store.timezone)`.
- Busca jornada abierta.
- Si no hay, responde estado `closed` con fecha local de hoy.
- Devuelve `timezone` y `first_business_date`.

`OpenStoreDayUseCase`

- Valida rol owner desde endpoint/dependency.
- Calcula `business_date`.
- Verifica que no haya jornada abierta.
- Verifica que no exista jornada cerrada para la misma fecha.
- Crea jornada.
- Fija `first_business_date` si hace falta.

`CloseStoreDayUseCase`

- Valida rol owner desde endpoint/dependency.
- Busca jornada abierta.
- Calcula snapshot simple:
  - total ventas completadas del `business_day_id`
  - cantidad ventas completadas
  - cantidad anuladas
- Cierra jornada.

`CreateSaleUseCase`

- Recibe `user_id` ademas de `store_id`.
- Consulta jornada abierta antes de crear venta.
- Si no hay jornada abierta, lanza error de negocio mapeado a `409`.
- Pasa `business_day_id`, `business_date`, `created_by_user_id` a `Sale.create`.

## Arquitectura Web

### Nuevos Archivos

```text
apps/web/src/features/store-day/types.ts
apps/web/src/features/store-day/schemas.ts
apps/web/src/features/store-day/api.ts
apps/web/src/features/store-day/actions.ts
apps/web/src/features/store-day/components/StoreDayStatusPanel.tsx
apps/web/src/features/store-day/components/StoreClosedNotice.tsx
```

### Archivos a Modificar

```text
apps/web/app/(app)/dashboard/page.tsx
apps/web/app/(app)/dashboard/pos/page.tsx
apps/web/src/features/pos/components/PosWorkspace.tsx
apps/web/src/features/pos/components/PosCheckoutPanel.tsx
apps/web/src/features/pos/actions.ts
apps/web/src/lib/auth/permissions.ts
```

### Flujo Web

Dashboard:

- Ejecutar `getDashboardSummary()` y `getCurrentStoreDay()` en paralelo con `Promise.all`.
- Renderizar `StoreDayStatusPanel` antes del resumen.
- Owner ve acciones abrir/cerrar.
- Cashier ve solo estado.
- Despues de abrir/cerrar, revalidar:
  - `/dashboard`
  - `/dashboard/pos`
  - `/dashboard/sales`

POS:

- `PosPage` debe ser async y consultar `getCurrentStoreDay()`.
- Si `status !== "open"`, mostrar `StoreClosedNotice` y no renderizar checkout habilitado.
- Si esta abierta, renderizar POS normal.
- `createSaleAction` debe seguir manejando `409` porque el backend es la autoridad final. Esto cubre race conditions donde el owner cierre la tienda mientras un cashier tiene el POS abierto.

Permisos UI:

- Agregar helper `canOpenCloseStore(role)`.
- Solo `owner` puede ver botones de abrir/cerrar.
- `cashier` puede vender solo si la tienda esta abierta.

## Plan de Implementacion

1. Backend migration y modelos SQLAlchemy.
2. Entidad de dominio `StoreBusinessDay` y contratos de repositorio.
3. Repositorio SQLAlchemy para buscar jornada abierta, buscar por fecha, crear y cerrar.
4. DTOs y use cases `current/open/close`.
5. Router `/store-day` y wiring en router principal/dependencias.
6. Extender `Sale` y `CreateSaleUseCase` para requerir jornada abierta.
7. Actualizar `SaleRepository.save` para persistir campos de jornada.
8. Actualizar seed para incluir `timezone` en la tienda demo; no abrir jornada automaticamente.
9. Crear feature web `store-day` con API, schemas, actions y componentes.
10. Actualizar Dashboard con panel de estado y acciones owner-only.
11. Actualizar POS para bloquear UI cuando la tienda este cerrada.
12. Agregar pruebas backend y web.
13. Ejecutar validaciones completas.

## Pruebas Requeridas

### Backend

- `test_get_current_store_day_returns_closed_when_no_open_day`
- `test_owner_can_open_store_day`
- `test_cashier_cannot_open_store_day`
- `test_cannot_open_second_store_day_when_one_is_open`
- `test_cannot_reopen_closed_day_in_sprint_1`
- `test_owner_can_close_open_store_day`
- `test_cashier_cannot_close_store_day`
- `test_cannot_close_without_open_store_day`
- `test_create_sale_requires_open_store_day`
- `test_create_sale_assigns_business_day_fields`
- `test_open_store_day_sets_first_business_date`
- `test_close_store_day_persists_sales_snapshot`

### Web

- `StoreDayStatusPanel_renders_closed_state`
- `StoreDayStatusPanel_renders_open_state`
- `StoreDayStatusPanel_shows_actions_for_owner`
- `StoreDayStatusPanel_hides_actions_for_cashier`
- `openStoreDayAction_revalidates_dashboard_pos_sales`
- `closeStoreDayAction_revalidates_dashboard_pos_sales`
- `PosPage_blocks_workspace_when_store_is_closed`
- `createSaleAction_shows_closed_store_message_on_409`

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

Nota: si `pnpm build` falla por lock de `.next/trace`, revisar si hay `pnpm dev` o `next dev` corriendo antes de declarar fallo real del build.

## Criterios de Aceptacion

- Owner ve en Dashboard si la tienda esta abierta o cerrada.
- Owner puede abrir una jornada desde Dashboard.
- Owner puede cerrar una jornada desde Dashboard.
- Cashier puede ver estado, pero no puede abrir ni cerrar.
- Backend rechaza open/close de cashier con `403`.
- Backend rechaza doble apertura con `409`.
- Backend rechaza cierre sin jornada abierta con `409`.
- POS aparece bloqueado cuando no hay jornada abierta.
- `POST /sales` responde `409` si la tienda esta cerrada.
- Venta creada durante jornada abierta queda asociada a `business_day_id` y `business_date`.
- Cerrar jornada guarda timestamps y snapshot basico.
- Tests backend y web pasan.

## Riesgos y Decisiones

- **Timezone:** el backend debe calcular `business_date`. El frontend no debe mandar boundaries UTC para este flujo.
- **Ventas historicas:** la migracion debe permitir null en campos nuevos de `sales` para no romper datos existentes.
- **Seed local:** no abrir automaticamente la jornada. Es mejor que DEBUG/local pruebe el flujo real: entrar como owner, abrir, vender, cerrar.
- **Race condition:** aunque POS bloquee en UI, `POST /sales` debe validar de nuevo en backend.
- **Offline futuro:** mobile/offline puede requerir reglas especiales para ventas sincronizadas despues del cierre. No entra en Sprint 1.
- **Reapertura:** no implementarla aun. Si se necesita luego, conviene usar historial/eventos de jornada.

## Recomendacion para Sprint 2

Despues de este sprint, avanzar con filtros y consistencia de fechas:

1. `GET /sales` con `from_date`, `to_date`, `status`, `limit`, `offset`.
2. Ventas con calendario default hoy y `min=first_business_date`.
3. Dashboard con tabs `Hoy` y `Mes`.
4. Reportes usando fechas locales `YYYY-MM-DD`, no datetimes con `Z`.
5. Servicio backend unico para rangos locales por timezone.

Ese orden evita construir filtros sobre una definicion ambigua de "hoy".
