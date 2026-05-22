# Store Day Open/Close Flow Analysis

Fecha: 2026-05-21

## Objetivo

Definir un flujo operativo para abrir y cerrar la tienda por dia, mejorar el tracking diario y corregir el comportamiento de fechas en Dashboard, Ventas y Reportes.

La meta no es solo agregar dos botones. La app necesita una entidad de "jornada operativa" para responder preguntas reales:

- La tienda esta abierta hoy?
- Desde que hora se permiten ventas?
- Que ventas pertenecen a la jornada actual?
- Cuando cerro el owner la jornada?
- Que pasa si el owner cierra temprano?
- Como consulto hoy, ayer, este mes o un rango historico?
- Que fechas no deben ser seleccionables porque son anteriores a la apertura inicial de la tienda?

## Estado Inicial Verificado Antes de Sprint 1

### Backend

Dashboard:

- `GET /api/v1/dashboard/summary` usa `GetDashboardSummaryUseCase`.
- El use case calcula "hoy" con `datetime.now(UTC).date()`.
- El rango del dashboard es `00:00:00` a `23:59:59` en UTC.
- No conoce apertura/cierre de tienda.
- No conoce zona horaria operativa de la tienda.
- `latest_sales` devuelve las ultimas 5 ventas sin limitarse al dia actual.

Reportes:

- `GET /api/v1/reports/sales` acepta `from` y `to`.
- `GetSalesReportUseCase` usa fechas recibidas o default backend de ultimos 7 dias.
- Valida maximo 90 dias.
- No conoce apertura de tienda.
- No evita consultar antes de la fecha operativa inicial.
- No distingue entre dia calendario y jornada operativa.

Ventas:

- `GET /api/v1/sales` lista todas las ventas de la tienda.
- No tiene filtros por fecha.
- No tiene paginacion.
- No tiene default "hoy".
- `POST /api/v1/sales` permite crear ventas sin verificar si la tienda esta abierta.

Modelo:

- `stores` tiene `created_at`, pero no tiene fecha de apertura operativa ni estado abierto/cerrado.
- No existe tabla de jornadas, cierres diarios, caja o turnos.

### Web

Dashboard:

- `/dashboard` llama `getDashboardSummary()`.
- No manda fecha ni rango.
- Muestra "Ventas hoy", pero ese "hoy" viene de backend en UTC.

Reportes:

- `/dashboard/reports` usa `parseReportSearchParams`.
- El default frontend es `30d`.
- El filtro de rango soporta `today`, `7d`, `30d`, `custom`.
- Las fechas se serializan como `YYYY-MM-DDT00:00:00.000Z` y `YYYY-MM-DDT23:59:59.999Z`.
- Eso fuerza UTC desde el cliente, lo cual puede cortar mal el dia local.

Ventas:

- `/dashboard/sales` llama `listSales()`.
- `listSales()` llama `/sales` sin parametros.
- No hay calendario ni filtros.
- La tabla de ventas muestra todo el historial.

## Problemas Actuales

### 1. "Hoy" no esta definido como dia operativo

El backend usa UTC. Para una tienda en Bolivia/Venezuela/LatAm, el dia local no coincide siempre con UTC.

Ejemplo:

- Una venta a las 21:00 hora local puede caer en el dia siguiente UTC.
- Dashboard puede contar esa venta en "manana" aunque operativamente sea hoy.

### 2. Dashboard, Ventas y Reportes no comparten una misma regla de fechas

Hoy cada modulo funciona distinto:

- Dashboard: hoy UTC fijo.
- Reportes web: default 30 dias.
- Reportes backend: default 7 dias si no recibe fechas.
- Ventas: sin filtro, todo el historial.

Esto hace que los numeros no coincidan.

### 3. No existe apertura/cierre de jornada

Sin una jornada diaria, el sistema no puede impedir ventas fuera de operacion ni cerrar resultados del dia.

Hoy el owner puede ver ventas, pero no existe un "corte" formal.

### 4. No hay fecha minima operativa

La UI puede permitir seleccionar fechas antiguas aunque la tienda no existia o no estaba abierta en la app.

Esto afecta:

- Ventas.
- Reportes.
- Dashboard historico.
- Exports.

### 5. La vista de ventas no tiene filtro de calendario

Ventas necesita filtro por fecha con default hoy. Si la tienda abre/cierra diariamente, esta pantalla debe ser la herramienta principal para revisar lo vendido en una jornada.

## Concepto Recomendado: Jornada Operativa

Agregar una entidad llamada `store_business_days` o `store_days`.

Una jornada representa el periodo operativo de una tienda para una fecha local.

No necesariamente es igual a `00:00-23:59`. El owner puede abrir a las 08:30, cerrar a las 13:00, reabrir a las 15:00 y cerrar otra vez a las 20:00. Las ventas pertenecen al `business_day_id`; los eventos definen la auditoria de cuando se habilito o cerro la operacion.

## Estado Implementado Despues de Sprint 1

La base actual ya tiene una jornada operativa funcional:

- `store_business_days` existe con `unique(store_id, business_date)`.
- `stores` tiene `timezone` y `first_business_date`.
- `sales` tiene `business_day_id`, `business_date` y `created_by_user_id`.
- `POST /sales` exige jornada abierta.
- `GET /store-day/current` devuelve la jornada abierta o la jornada cerrada del dia actual si existe.
- `POST /store-day/open` abre una jornada nueva si no existe una para hoy.
- `POST /store-day/close` cierra la jornada abierta y guarda snapshot basico.
- `POST /store-day/reopen` reabre la misma jornada cerrada del dia actual.
- Dashboard muestra estado operativo.
- Ajustes administra abrir/cerrar/reabrir.
- POS se bloquea si no hay jornada abierta.

Esto es correcto como MVP. La limitacion es que la reapertura actual muta el mismo registro y sobrescribe campos como `opened_at`, `closed_at`, `opening_note` y `closing_note`. Para operacion diaria basica esta bien; para auditoria fuerte no es suficiente.

## Modelo de Datos Recomendado a Mediano Plazo

La evolucion recomendada es mantener `store_business_days` como cabecera del dia y agregar una tabla append-only de eventos. Esto es mejor que crear varias jornadas para el mismo dia porque conserva una sola fuente de verdad para Dashboard, Ventas y Reportes, pero permite auditar multiples aperturas/cierres/reaperturas.

Tabla `store_business_days`:

```text
id uuid primary key
store_id uuid not null references stores(id)
business_date date not null
status varchar(20) not null
sales_total numeric(12,2) null
sales_count int null
voided_sales_count int null
created_at timestamptz not null
updated_at timestamptz not null
```

Estados:

- `open`
- `closed`

Tabla `store_business_day_events`:

```text
id uuid primary key
business_day_id uuid not null references store_business_days(id)
store_id uuid not null references stores(id)
event_type varchar(20) not null
note varchar(255) null
created_by_user_id uuid not null references users(id)
created_at timestamptz not null
```

Eventos:

- `open`
- `close`
- `reopen`

Restricciones:

```text
unique(store_id, business_date)
index(store_id, status)
index(store_id, business_date)
index(store_id, created_at)
index(store_business_day_events business_day_id, created_at)
index(store_business_day_events store_id, created_at)
index(store_business_day_events business_day_id, event_type, created_at)
```

Notas:

- `business_date` es la fecha local operativa de la tienda.
- `store_business_days.status` representa el estado actual.
- `store_business_day_events` conserva el historial completo de aperturas, cierres y reaperturas.
- Los timestamps se guardan en UTC.
- Los totales de cierre pueden guardarse como snapshot en `store_business_days`, pero los reportes deben poder recalcular desde ventas.
- Para consultas frecuentes de estado actual, leer `store_business_days` es O(1). Para auditoria, leer eventos por `business_day_id`.

### Comparacion con el Modelo Actual

Modelo actual:

- Simple.
- Ya implementado.
- Suficiente para bloquear POS y asociar ventas.
- Permite reapertura basica.
- No conserva historial completo de cada apertura/cierre.

Modelo con eventos:

- Agrega una tabla y algunos use cases mas.
- Conserva auditoria completa.
- Permite mostrar timeline de jornada.
- Es mejor para caja, cierres, turnos y soporte.
- No cambia la relacion de `sales.business_day_id`, por lo que la migracion futura es manejable.

Conclusion: no es un cambio grande si se hace antes de cierre avanzado/caja. Es una evolucion mediana y localizada. Conviene planearla para Sprint 2 o Sprint 3 antes de construir reportes definitivos de cierre diario.

## Store Settings Recomendado

Agregar campos operativos a `stores` o crear `store_settings`.

Opcion simple en `stores`:

```text
timezone varchar(64) not null default 'America/La_Paz'
first_business_date date null
```

Mejor opcion a mediano plazo:

```text
store_settings
  store_id uuid primary key
  timezone varchar(64) not null
  first_business_date date null
  require_open_day_for_sales boolean not null default true
```

Recomendacion inicial:

- Agregar `timezone` a `stores`.
- Agregar `first_business_date` a `stores`.
- Si queremos evitar tocar demasiado, usar `stores.created_at` como fallback de fecha minima.

## Reglas de Negocio

### Apertura de tienda

Solo `owner` puede abrir jornada.

Reglas:

- Si ya hay una jornada `open` para la tienda, no crear otra.
- Si existe jornada `closed` para `business_date` actual, el flujo actual permite reabrirla con `POST /store-day/reopen`.
- La reapertura basica usa el mismo registro de `store_business_days`; a mediano plazo debe registrar un evento `reopen`.
- Si no existe jornada para hoy, crear con:
  - `business_date = fecha local segun timezone de tienda`
  - `status = open`
- Si `first_business_date` es null, fijarla a `business_date`.

### Cierre de tienda

Solo `owner` puede cerrar jornada.

Reglas:

- Debe existir una jornada abierta.
- Cerrar setea:
  - `status = closed`
  - snapshots opcionales: total, count, voided count.
- En el modelo con eventos, tambien agrega evento `close` con `created_by_user_id`, `created_at` y nota.
- Despues del cierre, no se permiten nuevas ventas en esa jornada.

### Ventas

Recomendacion:

- `POST /sales` debe exigir jornada abierta si `require_open_day_for_sales = true`.
- La venta debe guardar `business_day_id`.
- La venta debe guardar `business_date`.

Campos sugeridos en `sales`:

```text
business_day_id uuid null references store_business_days(id)
business_date date null
created_by_user_id uuid null references users(id)
```

Reglas:

- Si la tienda esta cerrada: `409 Tienda cerrada`.
- Si hay jornada abierta: asociar venta a esa jornada.
- Si hay ventas offline/mobile futuras: usar sync con validacion especial. Para MVP web, bloquear venta sin jornada abierta.

### Dashboard

Default:

- Mostrar la jornada actual si esta abierta.
- Si no hay jornada abierta, mostrar estado "Tienda cerrada" y resumen del ultimo cierre o cero del dia actual.

Opciones:

- Dashboard de hoy: usa `business_day_id` abierto o `business_date = hoy local`.
- Dashboard mensual: usa rango local del mes, no UTC crudo.

### Ventas

Default:

- Vista de ventas abre con fecha de hoy local.
- Si hay jornada abierta, default ideal: jornada actual.
- Si no hay jornada abierta, default: fecha local de hoy.

Filtros:

- Fecha simple.
- Rango custom opcional.
- Estado: completadas/anuladas/todas.
- Metodo de pago opcional.

Regla de fecha minima:

- No permitir seleccionar `from` menor a `store.first_business_date`.
- Si no existe `first_business_date`, usar fecha local de `store.created_at`.

### Reportes

Mantener:

- Hoy.
- Ultimos 7 dias.
- Ultimos 30 dias.
- Mes actual.
- Personalizado.

Agregar:

- Mes actual como preset explicito.
- Respetar fecha minima.
- Usar timezone de tienda para construir rangos.

## API Propuesta

### Estado operativo

```http
GET /api/v1/store-day/current
```

Respuesta:

```json
{
  "status": "open",
  "business_date": "2026-05-21",
  "opened_at": "2026-05-21T12:30:00Z",
  "closed_at": null,
  "opened_by_user_id": "...",
  "closed_by_user_id": null,
  "timezone": "America/La_Paz",
  "first_business_date": "2026-05-21"
}
```

Si no hay jornada abierta:

```json
{
  "status": "closed",
  "business_date": "2026-05-21",
  "opened_at": null,
  "closed_at": null,
  "timezone": "America/La_Paz",
  "first_business_date": "2026-05-21"
}
```

### Abrir jornada

```http
POST /api/v1/store-day/open
```

Owner-only.

Payload opcional:

```json
{
  "opening_note": "Apertura normal"
}
```

### Cerrar jornada

```http
POST /api/v1/store-day/close
```

Owner-only.

Payload opcional:

```json
{
  "closing_note": "Cierre sin novedades"
}
```

### Reabrir jornada

```http
POST /api/v1/store-day/reopen
```

Owner-only.

Payload opcional:

```json
{
  "opening_note": "Reapertura por venta pendiente"
}
```

Reglas:

- Solo reabre la jornada cerrada de la fecha local actual.
- No crea otro `store_business_days`.
- Si ya hay una jornada abierta, responde `409`.
- A mediano plazo debe escribir un evento `reopen` en `store_business_day_events`.

### Dashboard summary

Actualizar:

```http
GET /api/v1/dashboard/summary?scope=today
GET /api/v1/dashboard/summary?scope=month
GET /api/v1/dashboard/summary?from=2026-05-01&to=2026-05-31
```

Recomendacion:

- `scope=today` por defecto.
- `today` usa fecha local/jornada.
- `month` usa mes local actual.

### Ventas

Actualizar:

```http
GET /api/v1/sales?from=2026-05-21&to=2026-05-21&status=all&limit=50&offset=0
```

Reglas:

- Default backend: hoy local.
- Validar `from >= first_business_date`.
- Paginado obligatorio.
- Orden `created_at desc`.

### Reportes

Mantener endpoint:

```http
GET /api/v1/reports/sales?from=2026-05-01&to=2026-05-21
```

Pero backend debe interpretar fechas locales o recibir parametros claros:

Opcion recomendada:

```http
GET /api/v1/reports/sales?from_date=2026-05-01&to_date=2026-05-21
```

Backend convierte `date` local a UTC usando `store.timezone`.

Evitar que el frontend mande `T00:00:00Z` porque eso fija UTC y puede romper el dia local.

## Cambios Backend Recomendados

### Nuevos archivos

```text
domain/entities/store_business_day.py
domain/repositories/store_business_day_repository.py
application/dto/store_day_dto.py
application/use_cases/store_day/
  get_current_store_day.py
  open_store_day.py
  close_store_day.py
infrastructure/database/models/store_business_day_model.py
infrastructure/database/repositories/store_business_day_repository.py
presentation/api/v1/store_day.py
```

### Cambios existentes

Ventas:

- `CreateSaleUseCase` debe validar jornada abierta.
- `Sale` entity debe soportar `business_day_id`, `business_date`, `created_by_user_id`.
- `SaleRepository.list_by_store` debe aceptar filtros y paginacion.
- `ISaleRepository` debe exponer metodos por rango local/UTC.

Dashboard:

- `GetDashboardSummaryUseCase` debe recibir input:

```python
store_id
scope
from_date
to_date
```

- Debe usar un servicio de rango operativo que respete timezone.

Reportes:

- `GetSalesReportUseCase` debe recibir fechas tipo `date` o convertir usando timezone de tienda.
- Debe validar contra `first_business_date`.

Store:

- Agregar `timezone`.
- Agregar `first_business_date`.

## Cambios Web Recomendados

### Dashboard

Agregar un panel de estado operativo:

- Tienda abierta/cerrada.
- Fecha de jornada.
- Hora de apertura.
- Link "Gestionar jornada" solo para owner.
- Cashier ve estado, pero no puede administrar jornada.

Default:

- Mostrar "Hoy" de jornada actual.
- Agregar toggle o tabs:
  - Hoy
  - Mes

No hacer dashboard complejo. El foco es que el owner entienda si puede vender y que el resumen coincida con ventas/reportes.

Las acciones de abrir, cerrar y reabrir deben vivir en Ajustes. Dashboard debe ser lectura operativa, no una pantalla de administracion global.

### POS

Si tienda cerrada:

- Mostrar estado bloqueado.
- No permitir confirmar venta.
- Mensaje: "La tienda esta cerrada. Un owner debe abrir la jornada para vender."

Si tienda abierta:

- POS funciona normal.

### Ventas

Agregar filtro de calendario:

- Default `from=today&to=today`.
- Input tipo date.
- Presets: Hoy, Ayer, Mes actual, Personalizado.
- `min` del date input = `first_business_date`.
- Si el usuario intenta URL vieja menor a minimo, normalizar a minimo y mostrar alerta.

La tabla debe usar datos paginados:

```text
Ventas del dia seleccionado
Total de resultados
Paginacion
```

### Reportes

Corregir filtros:

- Cambiar serializacion de fechas para no forzar UTC desde la UI.
- Enviar `YYYY-MM-DD` y dejar que backend convierta con timezone de tienda.
- Agregar preset `month`.
- Default recomendado:
  - Dashboard: hoy.
  - Ventas: hoy.
  - Reportes: mes actual o ultimos 30 dias. Recomendacion: mes actual para administracion.

### Settings

Agregar seccion operativa:

- Abrir/cerrar/reabrir jornada.
- Zona horaria de tienda.
- Fecha inicial operativa.
- Politica: requerir jornada abierta para vender.

La gestion de jornada ya vive aqui en el MVP. Zona horaria editable, historial de eventos y politicas avanzadas quedan para siguientes sprints.

## Arquitectura de Fechas Recomendada

### Principio

Guardar timestamps en UTC. Interpretar fechas de negocio en timezone de tienda.

### Backend como autoridad

El frontend no debe decidir boundaries UTC. Debe enviar fechas locales (`YYYY-MM-DD`) y el backend debe convertir:

```text
2026-05-21 local start -> UTC start
2026-05-21 local end -> UTC end
```

Esto evita bugs por zona horaria.

### Servicio de rangos

Crear helper/use case:

```python
BusinessDateRangeService
  today(store_timezone)
  month(store_timezone)
  custom(from_date, to_date, store_timezone)
  validate_min_date(first_business_date)
```

## Flujo Operativo Recomendado

### Inicio del dia

1. Owner entra al dashboard.
2. Dashboard consulta `GET /store-day/current`.
3. Si esta cerrado, muestra boton "Abrir tienda".
4. Owner abre jornada.
5. Backend crea `store_business_days`.
6. POS queda habilitado.
7. Dashboard muestra ventas de jornada actual.

### Durante el dia

1. Cashier vende desde POS.
2. Cada venta se asocia a `business_day_id`.
3. Ventas muestra por default la jornada de hoy.
4. Dashboard actualiza resumen de hoy.
5. Reportes pueden mostrar hoy, mes o rango.

### Cierre del dia

1. Owner presiona "Cerrar tienda".
2. Backend calcula snapshot:
   - total ventas completadas.
   - cantidad ventas.
   - cantidad anuladas.
   - items vendidos.
3. Backend setea `closed_at` y `status=closed`.
4. POS queda bloqueado.
5. Dashboard muestra jornada cerrada.

### Dia siguiente

1. Owner abre nueva jornada.
2. Nueva `business_date`.
3. Dashboard y ventas vuelven a default hoy.

## Reglas para Fechas Menores a Apertura

Definir `first_business_date`:

- Si la tienda ya tiene ventas, usar fecha local de la primera venta.
- Si no tiene ventas, usar fecha local de `stores.created_at`.
- Cuando el owner abre la primera jornada, fijar si estaba null.

Backend:

- Rechazar `from_date < first_business_date` con `422` o normalizar? Recomendacion: rechazar en API para que sea explicito.

Web:

- Usar `min={first_business_date}` en inputs de fecha.
- Si URL trae fecha menor, mostrar alerta y ajustar a minimo.

## Analisis de Fallos Actuales de Filtros

### Reportes

Problema probable:

- UI manda `YYYY-MM-DDT00:00:00.000Z`.
- Backend interpreta como UTC.
- Usuarios ven fechas locales.
- Resultado: ventas al final del dia local pueden caer fuera o dentro del rango equivocado.

Otro problema:

- Frontend default `30d`.
- Backend default `7d`.
- Si algun consumidor llama backend sin fechas, ve otra cosa.

### Dashboard

Problema probable:

- Dashboard usa UTC, no timezone local.
- `latest_sales` no esta filtrado por hoy.
- "Ventas hoy" y "Ultimas ventas" pueden no representar la misma jornada.

### Ventas

Problema claro:

- No hay filtros.
- Lista todas las ventas.
- No hay default hoy.
- No hay calendario.
- No hay paginacion.

## Implementacion por Fases

### Fase 1: Base de jornada y bloqueo de POS

Backend:

- Crear `store_business_days`.
- Agregar `timezone` y `first_business_date`.
- Endpoints current/open/close/reopen.
- `POST /sales` requiere jornada abierta.
- Asociar venta a jornada.
- Tests de apertura/cierre/reapertura y venta bloqueada.

Web:

- Panel de estado en dashboard.
- Acciones abrir/cerrar/reabrir en Ajustes para owner.
- POS bloqueado si cerrado.

### Fase 2: Eventos de jornada y fechas correctas en Dashboard/Ventas

Backend:

- Crear `store_business_day_events`.
- Al abrir/cerrar/reabrir, escribir evento append-only.
- Mantener `store_business_days.status` como estado actual.
- Exponer historial de eventos por jornada.
- Migrar datos existentes creando eventos iniciales desde campos actuales cuando sea posible.

Web:

- Mostrar timeline simple en Ajustes.
- Mostrar ultimo evento en Dashboard.
- Mantener acciones en Ajustes.

### Fase 3: Fechas correctas en Dashboard y Ventas

Backend:

- Dashboard acepta `scope=today|month`.
- Sales list acepta `from`, `to`, `status`, `limit`, `offset`.
- Rango usa timezone de tienda.
- Validar fecha minima.

Web:

- Dashboard tabs Hoy/Mes.
- Ventas con calendario default hoy.
- Date inputs con `min=first_business_date`.

### Fase 4: Reportes consistentes

Backend:

- Reportes aceptan fechas locales (`date`) o normalizan correctamente.
- Preset month si se decide en backend.

Web:

- Reportes default mes actual.
- Presets Hoy, 7d, 30d, Mes, Custom.
- No serializar `Z` desde frontend para fechas de negocio.

### Fase 5: Cierre avanzado

Opcional futuro:

- Conteo de caja.
- Monto inicial/final.
- Diferencia de efectivo.
- Turnos.
- Reapertura con motivo e historial completo.
- Export de cierre diario.

## Tests Requeridos

Backend:

1. `test_owner_opens_store_day`
2. `test_cashier_cannot_open_store_day`
3. `test_cannot_open_two_days_at_once`
4. `test_owner_closes_open_store_day`
5. `test_cashier_cannot_close_store_day`
6. `test_owner_reopens_closed_store_day`
7. `test_reopen_keeps_same_business_day_id`
8. `test_cashier_cannot_reopen_store_day`
9. `test_sale_requires_open_store_day`
10. `test_sale_is_assigned_to_business_day`
11. `test_dashboard_today_uses_open_business_day`
12. `test_dashboard_month_uses_store_timezone`
13. `test_sales_list_defaults_to_today`
14. `test_sales_list_rejects_date_before_first_business_date`
15. `test_reports_reject_date_before_first_business_date`
16. `test_report_boundaries_use_store_timezone`
17. `test_store_day_events_are_created_for_open_close_reopen` (fase eventos)

Web:

1. `StoreDayStatusPanel_renders_open_and_closed_states`
2. `StoreDayStatusPanel_hides_actions_for_cashier`
3. `StoreDayStatusPanel_renders_reopen_action`
4. `Settings_renders_store_day_management`
5. `Dashboard_renders_store_day_status_without_inline_management`
6. `PosPage_blocks_checkout_when_store_closed`
7. `SalesDateFilter_defaults_to_today`
8. `SalesDateFilter_uses_min_business_date`
9. `ReportsDateRangeFilter_supports_month_preset`
10. `ReportsDateRangeFilter_does_not_emit_utc_datetime`
11. `DashboardScopeTabs_switch_today_month`

## Criterios de Aceptacion

- Owner puede abrir y cerrar la tienda por dia.
- Owner puede reabrir una jornada cerrada del mismo dia.
- Cashier no puede abrir ni cerrar.
- Cashier no puede reabrir.
- No se pueden registrar ventas si la tienda esta cerrada.
- Ventas nuevas quedan asociadas a la jornada abierta.
- Dashboard por defecto muestra la jornada de hoy.
- Dashboard muestra estado operativo sin acciones destructivas.
- Ajustes administra abrir/cerrar/reabrir.
- Dashboard permite ver resumen del mes.
- Ventas por defecto muestra hoy.
- Ventas tiene filtro de calendario.
- Reportes usan fechas consistentes con la timezone de la tienda.
- No se pueden consultar fechas antes de `first_business_date`.
- Los filtros de fechas se comportan igual en Dashboard, Ventas y Reportes.

## Riesgos y Decisiones

- **Timezone:** es el riesgo principal. La decision correcta es centralizar conversion en backend.
- **Offline/mobile:** si mobile vende offline, cerrar tienda puede entrar en conflicto con ventas sincronizadas tarde. Para MVP web, bloquear venta si cerrado. Para offline futuro, usar reglas de sync por `business_day_id`.
- **Reapertura:** ya existe una version basica que reabre el mismo registro diario. La deuda tecnica es agregar eventos append-only para auditoria completa.
- **Eventos:** conviene agregarlos antes de cierre avanzado/caja. Sin eventos, una reapertura sobrescribe parte del contexto anterior.
- **Ventas despues del cierre:** rechazar en online. En offline, marcar conflicto.
- **Fecha minima:** usar `first_business_date`, con fallback a primera venta o `stores.created_at`.
- **Snapshot de cierre:** guardar snapshot ayuda auditoria, pero reportes deben poder recalcular.

## Recomendacion Final

El flujo mas eficiente es introducir una jornada operativa real antes de seguir agregando reportes. Sin `store_business_days`, cada pantalla va a seguir interpretando "hoy" de forma distinta.

Orden recomendado:

1. Agregar `store_business_days` y estado actual de tienda.
2. Bloquear `POST /sales` si no hay jornada abierta.
3. Asociar ventas a jornada.
4. Permitir reapertura basica de la misma jornada del dia.
5. Agregar `store_business_day_events` para auditoria.
6. Actualizar dashboard para jornada actual y mes.
7. Agregar filtros de calendario en ventas con default hoy.
8. Corregir reportes para usar fechas locales y timezone de tienda.
9. Agregar cierre avanzado/caja solo despues de estabilizar el flujo base y eventos.
