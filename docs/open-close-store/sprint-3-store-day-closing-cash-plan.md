# Sprint 3: Store Day Closing, Cash Count and Daily Close Report Plan

Fecha: 2026-05-22

## Objetivo

Convertir el cierre de tienda en un cierre operativo auditable.

Sprint 1 resolvio la base: abrir, cerrar, reabrir, bloquear POS y guardar eventos.

Sprint 2 resolvio la consistencia de fechas: Dashboard Hoy/Mes, Ventas con calendario y paginacion, Reportes con fechas locales y backfill de `sales.business_date`.

Sprint 3 debe resolver el siguiente problema real del owner: al cerrar la tienda, no basta con cambiar `status=closed`. El owner necesita saber:

- Cuanto deberia haber en caja?
- Cuanto conto fisicamente?
- Hay diferencia?
- Cuanto se vendio por efectivo, QR, transferencia y tarjeta?
- Cuantas ventas fueron anuladas?
- Que paso durante la jornada?
- Queda un comprobante o reporte del cierre diario?

La meta no es crear un modulo contable completo. La meta es entregar un cierre diario simple, trazable y suficiente para operacion diaria.

## Skills Aplicados

- `fastapi-templates`: mantener Clean Architecture, use cases explicitos, DTOs claros, repositorios por agregado y errores de dominio consistentes.
- `next-best-practices`: mantener lectura en Server Components, mutaciones en Server Actions, `searchParams` para reportes y fetches paralelos para evitar waterfalls.
- `vercel-react-best-practices`: componentes cliente pequenos para formularios de cierre, props serializables y UI de dashboard/reportes sin sobre-render.
- `supabase-postgres-best-practices`: indices por `store_id`, `business_day_id`, `business_date`; snapshots denormalizados solo donde aceleran cierres y auditoria.

## Estado Actual Verificado

### Backend

Ya implementado:

- `store_business_days` como cabecera diaria con `status=open|closed`.
- `store_business_day_events` append-only para `open`, `close`, `reopen`.
- `stores.timezone` y `stores.first_business_date`.
- `sales.business_day_id`, `sales.business_date`, `sales.created_by_user_id`.
- `POST /sales` exige jornada abierta.
- `GET /store-day/current`.
- `GET /store-day/current/events`.
- `POST /store-day/open`.
- `POST /store-day/close`.
- `POST /store-day/reopen`.
- `GET /sales` con fechas, status, paginacion y metadata.
- `GET /dashboard/summary?scope=today|month`.
- `GET /reports/sales?from_date&to_date`.
- `BusinessDateRangeService` centraliza rangos locales.
- Migracion `011` backfillea `sales.business_date`.
- Sync-created sales asigna `business_date`.

Limitaciones actuales:

- Cerrar jornada solo guarda snapshot basico de ventas.
- No existe conteo de caja.
- No existe monto inicial de caja.
- No existe diferencia esperada vs contada.
- No se separa efectivo esperado de otros metodos de pago.
- No existe endpoint de reporte de cierre diario.
- Reabrir despues de cierre no registra impacto sobre un cierre previamente contado.
- No hay bloqueo o advertencia si el owner intenta cerrar sin revisar resumen.
- No hay UI dedicada para cierre con resumen, conteo y confirmacion.

### Web

Ya implementado:

- Dashboard muestra estado de tienda y tabs `Hoy / Mes`.
- Ajustes administra abrir, cerrar y reabrir.
- Ajustes muestra timeline de eventos.
- POS se bloquea si la tienda esta cerrada.
- Ventas tiene filtros calendario/status y paginacion.
- Reportes usa fechas locales y preset `Mes actual`.

Limitaciones actuales:

- Ajustes tiene accion de cierre, pero no flujo de cierre.
- El owner no ve resumen de cierre antes de cerrar.
- No hay campos para efectivo contado, notas ni diferencias.
- No hay pantalla de cierre diario.
- Reportes muestra ventas generales, pero no un comprobante operativo de jornada.

## Estado Implementado Despues de Sprint 3

Backend:

- `store_business_days` conserva campos de caja y snapshot de cierre.
- `POST /store-day/open` acepta `opening_cash_amount`.
- `GET /store-day/current/closing-preview` devuelve preview de cierre owner-only.
- `POST /store-day/close` acepta `counted_cash_amount`.
- El cierre calcula `expected_cash_amount` y `cash_difference_amount`.
- El cierre guarda snapshot por metodo de pago:
  - efectivo.
  - QR.
  - transferencia.
  - tarjeta.
- `GET /store-day/current/close-report` devuelve reporte solo si la jornada actual esta cerrada.
- Si la jornada esta abierta, `GET /store-day/current/close-report` responde conflicto.
- `GET /store-day/reports` lista cierres con snapshot.
- `GET /store-day/reports/{business_day_id}` devuelve detalle historico.
- Reabrir conserva snapshot anterior, pero el backend bloquea el reporte actual mientras la jornada esta abierta.

Web:

- Ajustes permite abrir con caja inicial.
- Ajustes muestra preview de cierre cuando la jornada esta abierta.
- Ajustes exige efectivo contado para cerrar.
- Ajustes muestra boton `Ver reporte de cierre` cuando la jornada esta cerrada con snapshot.
- Si se reabre, el boton queda oculto mientras la jornada esta abierta.
- Existe pagina de detalle `/dashboard/reports/store-days/[businessDayId]`.
- Existe pagina historica `/dashboard/reports/store-days`.
- Reportes agrega acceso a `Cierres diarios`.

## Alcance Sprint 3

### Incluido

1. Agregar datos de caja al cierre de jornada.
2. Permitir registrar monto inicial de caja al abrir.
3. Permitir registrar efectivo contado al cerrar.
4. Calcular efectivo esperado desde ventas `payment_method=efectivo`.
5. Calcular diferencia de caja.
6. Guardar snapshot de cierre mas completo.
7. Agregar endpoint de preview de cierre antes de cerrar.
8. Agregar endpoint de reporte de jornada por `business_day_id` o fecha.
9. Actualizar cierre actual para aceptar datos de arqueo.
10. Mostrar flujo de cierre en Ajustes para owner.
11. Mostrar boton `Ver reporte de cierre` despues de cerrar, sin redireccion automatica.
12. Mantener permisos: owner cierra y reabre; cashier solo consulta estado donde ya aplica.
13. Agregar tests backend y web para cierre con caja.

### Fuera de Alcance

- Turnos por cashier.
- Caja por multiples cajeros.
- Gastos/egresos operativos.
- Depositos/retiros parciales.
- Cierre fiscal o contabilidad formal.
- Impuestos.
- Export PDF formal.
- RBAC granular.
- Resolucion completa de ventas offline sincronizadas despues del cierre.

Estos puntos deben quedar para Sprints posteriores. Sprint 3 debe entregar cierre diario util sin sobredisenar.

## Modelo de Datos Recomendado

### Opcion Recomendada para Sprint 3

Extender `store_business_days` con campos de snapshot y arqueo simple.

```text
store_business_days
  opening_cash_amount numeric(12,2) null
  expected_cash_amount numeric(12,2) null
  counted_cash_amount numeric(12,2) null
  cash_difference_amount numeric(12,2) null
  closing_sales_total numeric(12,2) null
  closing_sales_count int null
  closing_voided_sales_count int null
  closing_items_count int null
  closing_cash_sales_total numeric(12,2) null
  closing_qr_sales_total numeric(12,2) null
  closing_transfer_sales_total numeric(12,2) null
  closing_card_sales_total numeric(12,2) null
  closing_snapshot_at timestamptz null
```

Por que esta opcion:

- Es simple.
- Mantiene el cierre diario cerca de la jornada.
- No requiere un modelo de caja completo todavia.
- Permite construir reporte de cierre con una sola consulta principal.
- No rompe `sales.business_day_id`.

### Opcion Futura

Cuando existan turnos, gastos, depositos y multiples cajeros:

```text
cash_sessions
  id
  store_id
  business_day_id
  opened_by_user_id
  closed_by_user_id
  opening_cash_amount
  expected_cash_amount
  counted_cash_amount
  difference_amount
  status
  opened_at
  closed_at

cash_movements
  id
  cash_session_id
  movement_type: opening | sale | expense | deposit | withdrawal | adjustment | closing
  amount
  note
  created_by_user_id
  created_at
```

Decision: no crear `cash_sessions` todavia. Para una sola tienda/caja diaria, extender `store_business_days` es suficiente y reduce complejidad.

## Reglas de Negocio

### Apertura con caja inicial

`POST /store-day/open` debe aceptar opcionalmente:

```json
{
  "opening_note": "Apertura normal",
  "opening_cash_amount": "250.00"
}
```

Reglas:

- Solo owner.
- `opening_cash_amount >= 0`.
- Si no se envia, queda `0` o `null`. Recomendacion Sprint 3: default `0`.
- Se guarda en `store_business_days.opening_cash_amount`.
- El evento `open` sigue registrando nota y usuario.

### Preview de cierre

Nuevo endpoint:

```http
GET /api/v1/store-day/current/closing-preview
```

Respuesta:

```json
{
  "business_day_id": "uuid",
  "business_date": "2026-05-22",
  "status": "open",
  "opening_cash_amount": "250.00",
  "sales_total": "520.00",
  "sales_count": 18,
  "voided_sales_count": 1,
  "items_count": 42,
  "cash_sales_total": "300.00",
  "qr_sales_total": "120.00",
  "transfer_sales_total": "100.00",
  "card_sales_total": "0.00",
  "expected_cash_amount": "550.00"
}
```

Regla:

```text
expected_cash_amount = opening_cash_amount + cash_sales_total
```

No se incluyen QR/transferencia/tarjeta en caja fisica.

### Cierre con arqueo

`POST /store-day/close` debe aceptar:

```json
{
  "closing_note": "Cierre sin novedades",
  "counted_cash_amount": "548.00"
}
```

Reglas:

- Solo owner.
- Debe existir jornada abierta.
- `counted_cash_amount >= 0`.
- Backend recalcula snapshot al momento de cerrar.
- Backend calcula:
  - `expected_cash_amount`
  - `cash_difference_amount = counted_cash_amount - expected_cash_amount`
- Backend guarda snapshot en `store_business_days`.
- Backend registra evento `close`.
- POS queda bloqueado.

### Reapertura despues de cierre contado

Reapertura sigue permitida, pero debe quedar auditada.

Reglas para Sprint 3:

- `POST /store-day/reopen` mantiene el mismo `business_day_id`.
- Crea evento `reopen`.
- No borra los campos de cierre anteriores.
- Si se hacen ventas despues de reabrir, el cierre anterior queda obsoleto operativamente.
- Al volver a cerrar, se recalcula y sobreescribe snapshot de cierre con los nuevos totales.
- El timeline debe mostrar que hubo cierre, reapertura y nuevo cierre.
- Mientras la jornada este abierta, el reporte de cierre actual no debe poder consultarse desde el endpoint de jornada actual.
- En UI, el boton `Ver reporte de cierre` se oculta cuando la jornada esta abierta.

Nota: a futuro puede guardarse historico de cada cierre en una tabla separada. No es necesario para Sprint 3 porque ya tenemos eventos y el snapshot actual.

### Consulta del reporte despues de cerrar

El reporte no debe abrirse automaticamente al cerrar. La mejor UX para Sprint 3 es:

1. Owner revisa preview de cierre.
2. Owner ingresa efectivo contado.
3. Owner confirma cierre.
4. Backend calcula y guarda snapshot.
5. Ajustes queda en estado `closed`.
6. Ajustes muestra boton `Ver reporte de cierre`.
7. Owner decide si abre el reporte.

Ventajas:

- El cierre queda como accion principal y el reporte como consulta posterior.
- Si el owner no quiere revisar el reporte inmediatamente, no se le fuerza cambio de pantalla.
- Si quiere volver a verlo, el boton sigue disponible mientras la jornada este cerrada.
- Si reabre, el boton desaparece para evitar mostrar un snapshot potencialmente obsoleto como cierre final.
- Al cerrar nuevamente, el backend recalcula snapshot y el boton vuelve a aparecer.

Regla clave:

```text
El snapshot se genera al cerrar.
El reporte se puede consultar solo si la jornada esta cerrada.
```

### Ventas anuladas

Para cierre:

- `sales_total` debe contar solo `status=completed`.
- `sales_count` debe contar solo `status=completed`.
- `voided_sales_count` debe contar `status=voided`.
- `items_count` debe sumar items de ventas completadas.
- Totales por metodo de pago deben contar solo completadas.

## API Contract Propuesto

### Abrir jornada

Actualizar:

```http
POST /api/v1/store-day/open
```

Payload:

```json
{
  "opening_note": "Apertura normal",
  "opening_cash_amount": "250.00"
}
```

### Preview de cierre

Nuevo:

```http
GET /api/v1/store-day/current/closing-preview
```

Owner-only recomendado para Sprint 3, aunque cashier pueda ver estado de tienda.

### Cerrar jornada

Actualizar:

```http
POST /api/v1/store-day/close
```

Payload:

```json
{
  "closing_note": "Cierre sin novedades",
  "counted_cash_amount": "548.00"
}
```

### Reporte de cierre por jornada actual

Nuevo:

```http
GET /api/v1/store-day/current/close-report
```

Devuelve el cierre de la jornada actual solo si esta cerrada.

Reglas:

- Solo owner.
- Filtra por `store_id` del usuario autenticado.
- Busca la jornada de la fecha local actual.
- Si no existe jornada para hoy: `404`.
- Si la jornada esta `open`: `409 La jornada aun esta abierta`.
- Si la jornada esta `closed` pero no tiene snapshot de cierre: `409 El cierre aun no tiene snapshot disponible`.
- Si la jornada esta `closed` y tiene snapshot: devuelve reporte.

Esta validacion evita mostrar reportes obsoletos si la tienda fue reabierta.

### Reporte de cierre historico

Nuevo:

```http
GET /api/v1/store-day/reports?from_date=2026-05-01&to_date=2026-05-22&limit=50&offset=0
```

Respuesta:

```json
{
  "items": [
    {
      "business_day_id": "uuid",
      "business_date": "2026-05-22",
      "status": "closed",
      "opened_at": "2026-05-22T12:00:00Z",
      "closed_at": "2026-05-22T22:00:00Z",
      "opening_cash_amount": "250.00",
      "expected_cash_amount": "550.00",
      "counted_cash_amount": "548.00",
      "cash_difference_amount": "-2.00",
      "sales_total": "520.00",
      "sales_count": 18,
      "voided_sales_count": 1
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0,
  "from_date": "2026-05-01",
  "to_date": "2026-05-22"
}
```

## Cambios Backend

### Nuevos o Modificados

```text
apps/backend/src/domain/entities/store_business_day.py
apps/backend/src/domain/repositories/store_business_day_repository.py
apps/backend/src/application/dto/store_day_dto.py
apps/backend/src/application/use_cases/store_day/get_closing_preview.py
apps/backend/src/application/use_cases/store_day/get_close_report.py
apps/backend/src/application/use_cases/store_day/list_close_reports.py
apps/backend/src/application/use_cases/store_day/open_store_day.py
apps/backend/src/application/use_cases/store_day/close_store_day.py
apps/backend/src/infrastructure/database/models/store_business_day_model.py
apps/backend/src/infrastructure/database/repositories/store_business_day_repository.py
apps/backend/src/infrastructure/database/repositories/sale_repository.py
apps/backend/src/presentation/api/v1/store_day.py
apps/backend/src/infrastructure/database/alembic/versions/<next>_add_store_day_cash_closing_fields.py
```

### Repositorio de Ventas

Agregar metodo para breakdown por jornada:

```text
sales_closing_summary_for_business_day(store_id, business_day_id)
```

Debe devolver:

- total completado.
- cantidad completada.
- items completados.
- cantidad anulada.
- totales por payment_method.

Importante:

- Usar `store_id`.
- Usar `business_day_id`.
- Excluir `deleted_at`.
- Separar `completed` de `voided`.

### Repositorio de Jornadas

Agregar:

```text
list_by_date_range(store_id, from_date, to_date, limit, offset)
count_by_date_range(store_id, from_date, to_date)
```

Indices recomendados:

```text
index(store_id, business_date, status)
index(store_id, business_date, closed_at)
```

Ya existe `index(store_id, business_date)`. Agregar otro indice solo si las queries reales lo necesitan. Para Sprint 3, el existente puede ser suficiente.

## Cambios Web

### Ajustes

Actualizar la seccion de jornada:

- Cuando esta cerrada y no hay jornada de hoy: formulario de apertura con `opening_cash_amount` y nota.
- Cuando esta abierta: mostrar preview de cierre.
- Cierre debe pedir `counted_cash_amount` y nota.
- Mostrar diferencia antes de confirmar si el owner ingresa efectivo contado.
- Cuando queda cerrada: mostrar boton `Ver reporte de cierre`.
- Si se reabre: ocultar boton `Ver reporte de cierre` hasta el siguiente cierre.
- Mantener timeline de eventos.

Componentes sugeridos:

```text
apps/web/src/features/store-day/components/StoreDayOpenForm.tsx
apps/web/src/features/store-day/components/StoreDayCloseForm.tsx
apps/web/src/features/store-day/components/StoreDayClosingPreview.tsx
apps/web/src/features/store-day/components/StoreDayCloseReport.tsx
```

Decision UX:

- No redirigir automaticamente al reporte despues de cerrar.
- Despues de cerrar, quedarse en Ajustes y mostrar el boton `Ver reporte de cierre`.
- El boton puede abrir:
  - una pagina de detalle si queremos URL compartible, recomendado: `/dashboard/reports/store-days/[businessDayId]`;
  - o un modal si se prioriza velocidad de uso.
- Recomendacion Sprint 3: pagina de detalle. Es mas facil de reutilizar desde historial, soporta refresh y evita perder contexto.
- Modal puede quedar para una iteracion posterior como mejora de ergonomia.

### Dashboard

Mantener Dashboard como lectura.

Agregar solo una senal compacta si aplica:

- Estado abierto/cerrado.
- Si esta cerrada, mostrar diferencia de caja del ultimo cierre si esta disponible.

No mover acciones de cierre al Dashboard.

### Reportes

Agregar enlace o subpagina:

```text
/dashboard/reports/store-days
```

Contenido:

- Lista de cierres diarios.
- Filtro de fechas usando `YYYY-MM-DD`.
- Total ventas.
- Efectivo esperado.
- Efectivo contado.
- Diferencia.
- Link a detalle de cierre.

Detalle opcional en Sprint 3 si el tiempo alcanza:

```text
/dashboard/reports/store-days/[businessDayId]
```

Si hay que recortar alcance, hacer solo la lista con expand simple.

## Plan de Implementacion

1. Migracion de campos de caja/cierre en `store_business_days`.
2. Actualizar modelo SQLAlchemy y entidad de dominio.
3. Extender DTOs de `StoreDayResponseDTO`.
4. Extender payloads `OpenStoreDayDTO` y `CloseStoreDayDTO`.
5. Agregar resumen de cierre en `SaleRepository`.
6. Crear use case `GetClosingPreviewUseCase`.
7. Actualizar `CloseStoreDayUseCase` para snapshot completo y diferencia de caja.
8. Crear use case `GetCloseReportUseCase`.
9. Crear use case `ListCloseReportsUseCase`.
10. Agregar endpoints de preview y reportes.
11. Actualizar feature web `store-day` con formularios de apertura/cierre.
12. Agregar UI de preview en Ajustes.
13. Mostrar boton `Ver reporte de cierre` solo cuando la jornada actual este cerrada.
14. Agregar pagina de detalle de cierre diario.
15. Agregar reporte de cierres diarios en Reportes.
16. Agregar tests backend.
17. Agregar tests web.
18. Correr migracion, seed y validaciones completas.

## Pruebas Requeridas

### Backend

- `test_open_store_day_accepts_opening_cash_amount`
- `test_open_store_day_rejects_negative_opening_cash_amount`
- `test_closing_preview_requires_open_day`
- `test_closing_preview_calculates_cash_expected_from_cash_sales`
- `test_closing_preview_excludes_qr_transfer_card_from_cash`
- `test_close_store_day_accepts_counted_cash_amount`
- `test_close_store_day_calculates_cash_difference`
- `test_close_store_day_snapshots_payment_method_totals`
- `test_close_store_day_excludes_voided_sales_from_sales_total`
- `test_close_store_day_counts_voided_sales`
- `test_reclose_after_reopen_recalculates_snapshot`
- `test_cashier_cannot_get_closing_preview_if_owner_only`
- `test_cashier_cannot_close_with_cash_count`
- `test_close_report_returns_current_closed_day`
- `test_close_report_rejects_current_open_day`
- `test_close_report_rejects_closed_day_without_snapshot`
- `test_list_close_reports_filters_by_date_and_store`
- `test_list_close_reports_does_not_leak_other_store`

### Web

- `StoreDayOpenForm_validates_non_negative_opening_cash`
- `StoreDayCloseForm_validates_non_negative_counted_cash`
- `StoreDayClosingPreview_renders_expected_cash`
- `StoreDayClosingPreview_renders_payment_breakdown`
- `SettingsOverview_renders_closing_flow_when_open`
- `SettingsOverview_renders_opening_cash_when_closed`
- `closeStoreDayAction_sends_counted_cash_amount`
- `openStoreDayAction_sends_opening_cash_amount`
- `StoreDayCloseReport_renders_cash_difference`
- `SettingsOverview_shows_close_report_button_when_closed`
- `SettingsOverview_hides_close_report_button_when_open`
- `SettingsOverview_hides_close_report_button_after_reopen`
- `StoreDayReportsPage_renders_daily_closings`

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
2. Ir a Ajustes.
3. Abrir tienda con caja inicial `250`.
4. Crear ventas en POS:
   - efectivo `300`.
   - QR `120`.
   - transferencia `100`.
5. Volver a Ajustes.
6. Ver preview de cierre:
   - ventas total `520`.
   - efectivo esperado `550`.
7. Cerrar con efectivo contado `548`.
8. Confirmar diferencia `-2`.
9. Confirmar que Ajustes muestra boton `Ver reporte de cierre`.
10. Abrir reporte de cierre diario desde el boton.
11. Confirmar POS bloqueado.
12. Reabrir jornada.
13. Confirmar que el boton `Ver reporte de cierre` se oculta.
14. Crear venta adicional.
15. Confirmar que `GET /store-day/current/close-report` responde conflicto mientras esta abierta.
16. Cerrar de nuevo.
17. Confirmar snapshot recalculado, boton visible y timeline con open/close/reopen/close.

## Criterios de Aceptacion

- Owner puede abrir jornada con monto inicial de caja.
- Owner puede ver preview de cierre antes de cerrar.
- Preview muestra ventas por metodo de pago.
- Preview calcula efectivo esperado.
- Owner puede cerrar con efectivo contado.
- Backend calcula diferencia de caja.
- Cierre guarda snapshot completo en `store_business_days`.
- Despues de cerrar, Ajustes muestra boton `Ver reporte de cierre`.
- El cierre no redirige automaticamente al reporte.
- El endpoint de reporte de cierre actual rechaza jornadas abiertas.
- Si se reabre la tienda, el boton `Ver reporte de cierre` se oculta.
- Al volver a cerrar, el snapshot se recalcula y el boton vuelve a aparecer.
- Eventos siguen registrando open/close/reopen.
- Reapertura no crea otra jornada para el mismo dia.
- Re-cierre recalcula snapshot.
- Cashier no puede cerrar ni modificar datos de caja.
- Reporte de cierre diario muestra ventas, caja esperada, caja contada y diferencia.
- Reporte historico no filtra datos de otras tiendas.
- Dashboard sigue funcionando Hoy/Mes.
- Ventas y Reportes siguen usando fechas locales.
- Tests backend y web pasan.

## Riesgos y Decisiones

- **No sobredisenar caja:** usar campos en `store_business_days` para Sprint 3. `cash_sessions` queda para futuro.
- **Reapertura despues de cierre:** snapshot anterior puede quedar obsoleto. Mitigacion: ocultar boton `Ver reporte de cierre` mientras la jornada este abierta y bloquear `GET /current/close-report` con `409`.
- **Reporte consultable despues:** el owner necesita volver a ver el cierre. Decision: mostrar boton persistente mientras la jornada este cerrada; no redirigir automaticamente.
- **Snapshot sobrescrito en re-cierre:** si se reabre y se cierra otra vez, el snapshot final reemplaza al anterior. Mitigacion: eventos conservan auditoria de cierres/reaperturas; futuro puede guardar historico de snapshots si aparece necesidad real.
- **Ventas offline:** si se sincronizan ventas luego del cierre, el snapshot podria quedar desactualizado. Decision Sprint 3: documentar riesgo y recalcular al reabrir/cerrar. Futuro: marcar conflicto o requerir revision.
- **Metodos de pago:** efectivo fisico solo incluye `efectivo`. QR, transferencia y tarjeta se reportan, pero no suman a caja contada.
- **Permisos:** mantener simple: owner administra caja; cashier no.
- **Precision monetaria:** usar `Decimal` en backend y `numeric(12,2)` en DB. No usar floats.

## Recomendacion Final

Sprint 3 debe entregar el primer cierre diario realmente util.

Orden recomendado:

1. Modelo y migracion de campos de caja.
2. Preview backend de cierre.
3. Cierre backend con snapshot completo.
4. Validacion backend para consultar reporte solo si la jornada esta cerrada.
5. UI de cierre en Ajustes con boton `Ver reporte de cierre`.
6. Pagina de detalle de reporte diario.
7. Tests y validacion manual.

Despues de este sprint, el siguiente paso natural es Sprint 4: gastos/egresos, movimientos de caja y reporte historico mas completo.
