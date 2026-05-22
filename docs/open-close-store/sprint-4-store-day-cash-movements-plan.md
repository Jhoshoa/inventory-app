# Sprint 4: Store Day Cash Movements, Expenses and Cash Reconciliation Plan

Fecha: 2026-05-22

## Objetivo

Convertir el cierre diario de Sprint 3 en un control de caja mas realista para tiendas pequenas e informales.

Sprint 1 resolvio abrir/cerrar/reabrir la tienda y bloquear POS.
Sprint 2 resolvio fechas locales, Dashboard, Ventas y Reportes.
Sprint 3 resolvio preview de cierre, caja inicial, cierre con conteo opcional, snapshot por metodo de pago y reporte diario.

Sprint 4 debe resolver el siguiente problema real:

- Durante el dia entra o sale efectivo que no viene de ventas.
- El owner puede pagar transporte, bolsas, delivery, cambio para caja, comida, comisiones o pequenos gastos.
- Tambien puede retirar efectivo para deposito o uso personal.
- Al cerrar, el efectivo esperado debe considerar esos movimientos.
- El reporte de cierre debe explicar por que la caja esperada cambio.

La meta no es crear contabilidad completa. La meta es agregar un libro simple de movimientos de caja por jornada, trazable y suficiente para cierre diario.

## Skills Aplicados

- `fastapi-templates`: mantener Clean Architecture con entidad de dominio `CashMovement`, repositorio propio, DTOs explicitos y use cases por accion.
- `next-best-practices`: mantener lecturas en Server Components, mutaciones en Server Actions, filtros via `searchParams` y evitar waterfalls con `Promise.all`.
- `vercel-react-best-practices`: componentes cliente pequenos solo para formularios/dialogos, props serializables y tablas/reportes estables.
- `supabase-postgres-best-practices`: indices por `store_id`, `business_day_id`, `created_at` y consultas siempre scoped por tienda autenticada.

## Estado Actual Verificado

### Backend

Ya implementado:

- `store_business_days` como cabecera diaria.
- `store_business_day_events` para `open`, `close`, `reopen`.
- `opening_cash_amount`.
- `expected_cash_amount`.
- `counted_cash_amount` opcional.
- `cash_difference_amount`.
- `skip_cash_count` para cierre rapido sin conteo fisico.
- Snapshot de cierre por metodo de pago.
- Preview de cierre owner-only.
- Reporte actual e historico de cierres owner-only.
- Re-cierre recalcula y sobreescribe snapshot final.
- Consultas de cierre scoped por `store_id`.
- `stock_movements` ya tiene un patron similar de auditoria, filtros, paginacion y export.

Limitaciones actuales:

- No existe tabla de movimientos de caja.
- `expected_cash_amount` solo considera `opening_cash_amount + ventas en efectivo`.
- No se registran gastos/egresos del dia.
- No se registran ingresos manuales de efectivo.
- No se registran depositos/retiros de caja.
- No se puede explicar una diferencia causada por movimientos legitimos.
- El reporte de cierre no muestra libro de caja.
- No hay export CSV de movimientos de caja.

### Web

Ya implementado:

- Ajustes permite abrir con caja inicial.
- Ajustes permite cerrar con conteo o `Sin conteo`.
- Ajustes muestra preview de cierre.
- Reportes tiene `Cierres diarios`.
- Reportes tiene lista/detalle de cierres.
- Reportes tiene patron existente para `Movimientos de stock`.

Limitaciones actuales:

- No hay UI para registrar gasto o retiro de caja.
- No hay tabla de movimientos de caja por jornada.
- No hay filtros de movimientos de caja.
- El preview de cierre no explica ajustes a efectivo esperado.
- El reporte de cierre no incluye ingresos/egresos manuales.

## Decision Principal Sprint 4

Crear una tabla append-only `cash_movements` asociada a la jornada operativa.

No crear `cash_sessions` todavia.

Razon:

- La app aun maneja una sola caja diaria por tienda.
- No hay turnos por cajero.
- No hay multiples cajas.
- El cierre final sigue viviendo en `store_business_days`.
- Los movimientos de caja explican el efectivo esperado sin convertir la app en sistema contable.

Sprint 4 debe mantener este principio:

```text
store_business_days = snapshot final del dia
cash_movements = detalle operativo append-only de entradas/salidas manuales
sales = fuente de ventas
```

## Modelo de Datos Recomendado

### Nueva tabla `cash_movements`

```text
cash_movements
  id uuid primary key
  store_id uuid not null references stores(id)
  business_day_id uuid not null references store_business_days(id)
  movement_type varchar(30) not null
  amount numeric(12,2) not null
  note varchar(255) null
  created_by_user_id uuid not null references users(id)
  occurred_at timestamptz not null
  created_at timestamptz not null
  voided_at timestamptz null
  voided_by_user_id uuid null references users(id)
  void_reason varchar(255) null
```

Tipos iniciales:

```text
cash_in      entrada manual de efectivo
cash_out     salida manual de efectivo
expense      gasto operativo pagado en efectivo
deposit      retiro para deposito bancario
withdrawal   retiro no clasificado o retiro del owner
adjustment   ajuste manual excepcional
```

Signo recomendado:

- Guardar `amount` siempre positivo.
- `movement_type` determina si suma o resta al efectivo esperado.
- Evitar montos negativos en API y DB.

Impacto en caja esperada:

```text
cash_in      suma
adjustment   suma o resta? Decision Sprint 4: no usar adjustment con signo. Usar cash_in/cash_out.
cash_out     resta
expense      resta
deposit      resta
withdrawal   resta
```

Decision: para Sprint 4, `adjustment` queda fuera del flujo principal o se reserva para futuro. Los tipos operativos suficientes son `cash_in`, `cash_out`, `expense`, `deposit`, `withdrawal`.

### Indices

```text
index cash_movements(store_id, business_day_id, occurred_at)
index cash_movements(store_id, occurred_at)
index cash_movements(store_id, movement_type, occurred_at)
index cash_movements(business_day_id, occurred_at)
```

Opcional si Postgres real lo necesita:

```text
partial index where voided_at is null
```

Para Sprint 4, empezar con indices compuestos simples por patrones de consulta.

## Reglas de Negocio

### Registrar movimiento de caja

Endpoint:

```http
POST /api/v1/cash-movements
```

Payload:

```json
{
  "movement_type": "expense",
  "amount": "25.00",
  "note": "Bolsas plasticas"
}
```

Reglas:

- Solo owner.
- Debe existir jornada abierta.
- `amount > 0`.
- `note` maximo 255 caracteres.
- Se asocia a `business_day_id` abierto.
- Se guarda `store_id` desde usuario autenticado.
- Se guarda `created_by_user_id`.
- No se permite elegir `store_id` ni `business_day_id` desde el cliente.
- No se permite registrar movimientos si la tienda esta cerrada.

### Listar movimientos de caja

Endpoint:

```http
GET /api/v1/cash-movements?from_date=2026-05-01&to_date=2026-05-22&type=expense&limit=50&offset=0
```

Reglas:

- Owner-only recomendado para Sprint 4.
- Siempre filtrar por `store_id` autenticado.
- Soportar filtro por:
  - rango de fechas locales.
  - `business_day_id`.
  - `movement_type`.
  - `include_voided=false` por defecto.
- Paginacion obligatoria.

### Anular movimiento de caja

Endpoint:

```http
POST /api/v1/cash-movements/{movement_id}/void
```

Payload:

```json
{
  "void_reason": "Registro duplicado"
}
```

Reglas:

- Solo owner.
- Movimiento debe pertenecer al `store_id` autenticado.
- Movimiento no debe estar anulado.
- Guardar `voided_at`, `voided_by_user_id`, `void_reason`.
- No borrar fisicamente.
- Si la jornada esta cerrada, recomendacion Sprint 4: permitir anular solo si se reabre primero. Esto evita alterar reportes finales cerrados sin recalcular.

Decision Sprint 4:

```text
Crear/anular movimientos solo cuando la jornada esta abierta.
Si ya cerro, debe reabrir, corregir y cerrar de nuevo.
```

Esto mantiene coherencia con Sprint 3: el snapshot final se recalcula al cierre.

### Preview de cierre con movimientos

Actualizar:

```http
GET /api/v1/store-day/current/closing-preview
```

Agregar campos:

```json
{
  "cash_movements_in_total": "50.00",
  "cash_movements_out_total": "75.00",
  "cash_movements_count": 3,
  "expected_cash_amount": "525.00"
}
```

Nueva formula:

```text
expected_cash_amount =
  opening_cash_amount
  + cash_sales_total
  + cash_movements_in_total
  - cash_movements_out_total
```

Donde:

- `cash_in` suma.
- `cash_out`, `expense`, `deposit`, `withdrawal` restan.
- movimientos anulados no cuentan.

### Cierre con snapshot de movimientos

Actualizar `store_business_days` con campos opcionales:

```text
closing_cash_movements_in_total numeric(12,2) null
closing_cash_movements_out_total numeric(12,2) null
closing_cash_movements_count int null
```

Razon:

- El reporte de cierre debe mostrar el resumen final aunque luego cambien datos historicos.
- Igual que ventas, el cierre guarda snapshot final.

Alternativa:

- Recalcular siempre desde `cash_movements`.

Decision Sprint 4:

- Guardar snapshot resumen en `store_business_days`.
- Mantener detalle en `cash_movements`.
- Reporte historico lee snapshot para totales y lista movimientos por detalle si se abre el reporte.

## API Contract Propuesto

### Crear movimiento

```http
POST /api/v1/cash-movements
```

```json
{
  "movement_type": "expense",
  "amount": "25.00",
  "note": "Bolsas plasticas"
}
```

Respuesta:

```json
{
  "id": "uuid",
  "store_id": "uuid",
  "business_day_id": "uuid",
  "movement_type": "expense",
  "direction": "out",
  "amount": "25.00",
  "note": "Bolsas plasticas",
  "created_by_user_id": "uuid",
  "occurred_at": "2026-05-22T15:00:00Z",
  "voided_at": null,
  "void_reason": null
}
```

### Listar movimientos

```http
GET /api/v1/cash-movements?from_date=2026-05-01&to_date=2026-05-22&type=all&limit=50&offset=0
```

Respuesta:

```json
{
  "items": [],
  "total": 0,
  "limit": 50,
  "offset": 0,
  "from_date": "2026-05-01",
  "to_date": "2026-05-22"
}
```

### Movimientos de jornada actual

```http
GET /api/v1/store-day/current/cash-movements
```

Decision:

- Puede existir como endpoint conveniente.
- Internamente usa `business_day_id` actual.
- Owner-only.
- Si no hay jornada de hoy, devuelve lista vacia o 404. Recomendacion: lista vacia para UI simple.

### Anular movimiento

```http
POST /api/v1/cash-movements/{movement_id}/void
```

```json
{
  "void_reason": "Registro duplicado"
}
```

## Cambios Backend

### Nuevos archivos

```text
apps/backend/src/domain/entities/cash_movement.py
apps/backend/src/domain/repositories/cash_movement_repository.py
apps/backend/src/application/dto/cash_movement_dto.py
apps/backend/src/application/use_cases/cash_movements/create_cash_movement.py
apps/backend/src/application/use_cases/cash_movements/list_cash_movements.py
apps/backend/src/application/use_cases/cash_movements/void_cash_movement.py
apps/backend/src/infrastructure/database/models/cash_movement_model.py
apps/backend/src/infrastructure/database/repositories/cash_movement_repository.py
apps/backend/src/presentation/api/v1/cash_movements.py
apps/backend/src/infrastructure/database/alembic/versions/<next>_create_cash_movements.py
```

### Modificados

```text
apps/backend/src/application/dto/store_day_dto.py
apps/backend/src/application/use_cases/store_day/get_closing_preview.py
apps/backend/src/application/use_cases/store_day/close_store_day.py
apps/backend/src/application/use_cases/store_day/_closing_report.py
apps/backend/src/domain/entities/store_business_day.py
apps/backend/src/domain/repositories/store_business_day_repository.py
apps/backend/src/infrastructure/database/models/store_business_day_model.py
apps/backend/src/infrastructure/database/repositories/store_business_day_repository.py
apps/backend/src/presentation/dependencies.py
apps/backend/src/presentation/api/v1/router.py
```

### Repositorio de caja

Metodos:

```text
create(movement)
get_by_id(store_id, movement_id)
list_by_store(store_id, from_date, to_date, type, limit, offset)
list_by_business_day(store_id, business_day_id)
summary_for_business_day(store_id, business_day_id)
void(store_id, movement_id, voided_by_user_id, reason)
```

`summary_for_business_day` debe devolver:

```text
in_total
out_total
count
by_type
```

Siempre:

- filtrar `store_id`.
- filtrar `business_day_id`.
- excluir `voided_at is not null`.

## Cambios Web

### Ajustes / Jornada

Cuando la jornada esta abierta:

- Mostrar preview de cierre.
- Mostrar formulario compacto para registrar movimiento de caja.
- Mostrar lista de movimientos de caja del dia.
- Permitir anular movimiento antes de cerrar.

Formulario sugerido:

```text
Tipo: Gasto | Entrada | Retiro | Deposito
Monto
Nota
Boton: Registrar movimiento
```

No hacer modal complejo al inicio. Un formulario compacto dentro de Ajustes es suficiente.

### Reportes

Agregar pagina:

```text
/dashboard/reports/cash-movements
```

Contenido:

- Filtro por fechas.
- Filtro por tipo.
- Tabla paginada.
- Total entradas.
- Total salidas.
- Link a cierre diario relacionado.

Agregar enlace desde `/dashboard/reports` solo para owner:

```text
Movimientos de caja
```

### Reporte de cierre diario

Actualizar detalle `/dashboard/reports/store-days/[businessDayId]`:

- Mostrar resumen:
  - caja inicial.
  - ventas efectivo.
  - entradas manuales.
  - salidas manuales.
  - efectivo esperado.
  - efectivo contado o `Sin conteo`.
  - diferencia o `No calculada`.
- Mostrar tabla de movimientos de caja de esa jornada.

### Dashboard

Mantener lectura.

Opcional Sprint 4:

- Si tienda abierta, mostrar indicador compacto:
  - entradas/salidas de caja del dia.

No mover acciones de caja al Dashboard en Sprint 4.

## Permisos

Recomendacion Sprint 4:

- Owner:
  - crear movimientos.
  - anular movimientos.
  - ver movimientos.
  - ver reportes de caja.
- Cashier:
  - no crea movimientos de caja en Sprint 4.
  - no ve reportes de caja.

Razon:

- En tiendas informales, el owner suele controlar caja.
- Dar permisos a cashier requiere RBAC granular o politicas por tienda.
- Eso queda para un sprint posterior.

Futuro:

```text
can_manage_cash_movements
can_view_cash_movements
```

## Pruebas Requeridas

### Backend

- `test_owner_creates_cash_in_for_open_day`
- `test_owner_creates_expense_for_open_day`
- `test_cashier_cannot_create_cash_movement`
- `test_cannot_create_cash_movement_without_open_day`
- `test_create_cash_movement_rejects_negative_or_zero_amount`
- `test_create_cash_movement_scopes_to_authenticated_store`
- `test_list_cash_movements_filters_by_date_type_and_store`
- `test_list_cash_movements_does_not_leak_other_store`
- `test_void_cash_movement_marks_voided`
- `test_void_cash_movement_requires_open_business_day`
- `test_voided_cash_movement_excluded_from_summary`
- `test_closing_preview_includes_cash_movements`
- `test_close_store_day_snapshots_cash_movement_totals`
- `test_reclose_after_reopen_recalculates_cash_movements`
- `test_close_report_includes_cash_movement_totals`

### Web

- `CashMovementForm_validates_positive_amount`
- `CashMovementForm_sends_type_amount_note`
- `CashMovementForm_hidden_for_cashier`
- `StoreDayStatusPanel_renders_cash_movements_when_open`
- `StoreDayClosingPreview_renders_cash_movement_totals`
- `StoreDayCloseReport_renders_cash_movement_totals`
- `CashMovementsPage_renders_filters_and_table`
- `CashMovementsPage_blocks_cashier`
- `VoidCashMovementAction_sends_reason`

## Validacion Manual

Backend:

```bash
cd apps/backend
python -m alembic upgrade head
python -m pytest tests -q -p no:cacheprovider
python -m ruff check src tests --no-cache
```

Web:

```bash
cd apps/web
corepack pnpm typecheck
corepack pnpm test
corepack pnpm lint
corepack pnpm build
```

Flujo manual:

1. Entrar como owner.
2. Abrir jornada con caja inicial `250`.
3. Crear venta efectivo `300`.
4. Registrar gasto `25` por bolsas.
5. Registrar retiro `50` para deposito.
6. Registrar entrada `20` por cambio adicional.
7. Ver preview:
   - caja inicial `250`.
   - efectivo ventas `300`.
   - entradas `20`.
   - salidas `75`.
   - efectivo esperado `495`.
8. Cerrar con conteo `490`.
9. Confirmar diferencia `-5`.
10. Abrir reporte de cierre.
11. Confirmar movimientos listados.
12. Reabrir jornada.
13. Anular un movimiento o agregar otro.
14. Cerrar de nuevo.
15. Confirmar snapshot recalculado.

## Criterios de Aceptacion

- Owner puede registrar entrada de efectivo en jornada abierta.
- Owner puede registrar gasto/salida/retiro/deposito en jornada abierta.
- Cashier no puede registrar ni ver movimientos de caja.
- Cashier no puede exportar movimientos de caja.
- No se pueden registrar movimientos si la tienda esta cerrada.
- Montos deben ser positivos y con precision monetaria.
- Todos los movimientos quedan scoped por `store_id` y `business_day_id`.
- Preview de cierre incluye entradas y salidas manuales.
- Efectivo esperado considera movimientos de caja.
- Cierre guarda snapshot de movimientos de caja.
- Reporte de cierre muestra resumen y detalle de movimientos.
- Reporte de movimientos de caja tiene filtro visible por tipo.
- Reporte de movimientos de caja permite export CSV owner-only.
- Historico de movimientos no filtra datos de otra tienda.
- Movimientos anulados no afectan preview ni cierre.
- Si la jornada se reabre, cambios de caja recalculan el siguiente cierre.
- Tests backend y web pasan.

## Actualizacion Sprint 4.1

Fecha: 2026-05-22

Se cerro la deuda menor identificada antes de iniciar Sprint 5:

- Se agrego filtro visible por tipo en `/dashboard/reports/cash-movements`.
- Se agrego export CSV de movimientos de caja:
  - Web: `/api/exports/cash-movements`.
  - Backend: `/api/v1/exports/cash-movements.csv`.
  - Parametros soportados: `from`, `to`, `type`.
- Se mantiene owner-only en backend para export/list/create/void.
- La pagina de movimientos sigue bloqueada para cashier desde UI.
- Se agregaron tests frontend para:
  - controles de filtro/export.
  - tabla de movimientos y totales con signo.
  - formulario compacto de movimiento en Ajustes.
  - link de export CSV de caja en panel de exportes.
- Se agregaron tests backend para:
  - cashier bloqueado en export.
  - CSV con columnas esperadas.
  - filtro de export por tipo.

Pendiente fuera de automatizacion:

- Validacion manual completa en navegador con flujo real owner/cashier.

## Fuera de Alcance

- Multiples cajas.
- Turnos por cajero.
- Arqueo por cashier.
- Comprobantes con imagen.
- Categorias contables completas.
- Impuestos.
- PDF formal.
- Integracion bancaria.
- RLS granular por permiso custom.
- Historial de snapshots por cada intento de cierre.

## Riesgos y Decisiones

- **No sobredisenar caja:** `cash_movements` basta para Sprint 4. `cash_sessions` queda para cuando existan turnos o multiples cajas.
- **Movimientos despues del cierre:** no permitir. Si hay correccion, owner reabre, corrige y cierra de nuevo.
- **Anulaciones:** usar soft void, no delete.
- **Precision monetaria:** usar `Decimal` y `numeric(12,2)`.
- **Auditoria:** guardar `created_by_user_id`, `occurred_at`, `voided_by_user_id`.
- **Store scope:** nunca aceptar `store_id` del cliente.
- **UX informal:** mantener formulario rapido; no obligar categorias contables.
- **Offline:** si mobile offline aparece luego, movimientos sincronizados despues del cierre deben marcar conflicto o requerir reapertura. Fuera de Sprint 4.

## Que Mas Podemos Hacer en Esta Feature

Recomendado para Sprint 4:

1. Movimientos de caja simples.
2. Preview y cierre con entradas/salidas.
3. Reporte historico de movimientos.
4. Detalle de cierre con libro de caja.

No recomendado todavia:

1. Turnos por cajero.
2. `cash_sessions`.
3. Contabilidad formal.
4. PDF.
5. Imagenes de comprobantes.

Mejora pequena si sobra tiempo:

- Agregar resumen compacto en Dashboard cuando la tienda este abierta:
  - efectivo esperado.
  - salidas del dia.
  - entradas del dia.

Esto ayuda al owner sin mover acciones administrativas fuera de Ajustes.

## Plan de Implementacion

1. Crear migracion `cash_movements` y campos snapshot en `store_business_days`.
2. Crear entidad, DTOs y repositorio de `CashMovement`.
3. Crear use cases: create, list, void, summary.
4. Agregar endpoints `/cash-movements`.
5. Integrar `CashMovementRepository` en `get_closing_preview`.
6. Integrar resumen de caja manual en `close_store_day`.
7. Extender DTOs de preview y close report.
8. Agregar UI en Ajustes para registrar movimientos en jornada abierta.
9. Agregar lista compacta de movimientos actuales.
10. Agregar pagina `/dashboard/reports/cash-movements`.
11. Actualizar detalle de cierre diario.
12. Agregar tests backend.
13. Agregar tests web.
14. Ejecutar migracion, tests, typecheck y build.

## Recomendacion Final

Sprint 4 debe ser el puente entre cierre diario y caja real.

La decision correcta es agregar `cash_movements` append-only y mantener `store_business_days` como snapshot final. Esto da valor inmediato al owner porque explica la caja esperada sin introducir turnos, contabilidad o multiples cajas antes de tiempo.

Despues de Sprint 4, el siguiente paso natural seria Sprint 5: turnos por cajero o mejoras de auditoria/export del cierre, dependiendo de si el uso real muestra necesidad de controlar personas o documentos.
