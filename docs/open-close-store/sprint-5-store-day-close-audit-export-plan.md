# Sprint 5: Store Day Close Audit, Print and Export Plan

Fecha: 2026-05-22

## Objetivo

Convertir el reporte de cierre diario en un documento operativo mas confiable para owner, auditoria interna y revision posterior.

Sprint 1 resolvio abrir/cerrar/reabrir tienda y bloquear POS.
Sprint 2 resolvio fechas locales, Dashboard, Ventas y Reportes.
Sprint 3 resolvio preview de cierre, caja inicial, cierre con conteo opcional, snapshot por metodo de pago y reporte diario.
Sprint 4 resolvio movimientos de caja manuales y conciliacion de efectivo esperado.

Sprint 5 debe resolver el siguiente problema real:

- El owner necesita imprimir o guardar el cierre del dia.
- El cierre puede reabrirse y cerrarse nuevamente.
- El snapshot final de `store_business_days` se actualiza con el ultimo cierre, pero no existe historial completo de cada intento de cierre.
- Si cambia el monto contado, los movimientos de caja o una venta anulada antes del re-cierre, se necesita saber que cambio entre cierres.
- El equipo necesita exportar datos simples sin depender de inspeccionar la base de datos.

La meta no es crear contabilidad formal ni reportes fiscales. La meta es agregar trazabilidad practica del cierre y salida operativa para impresion/exportacion.

## Skills Aplicados

- `fastapi-templates`: mantener Clean Architecture con entidad de snapshot de cierre, repositorio propio, DTOs explicitos y use cases por lectura/exportacion.
- `next-best-practices`: mantener datos de reportes en Server Components, acciones de export/print aisladas, filtros via `searchParams` y route handlers para descargas autenticadas.
- `vercel-react-best-practices`: componentes cliente pequenos solo para botones de imprimir/descargar, props serializables y evitar cargar librerias pesadas de PDF en el bundle.
- `supabase-postgres-best-practices`: consultas siempre scoped por `store_id`, indices por `store_id`, `business_day_id`, `closed_at`, y snapshots append-only para auditoria.

## Estado Actual Verificado

### Backend

Ya implementado:

- `store_business_days` como cabecera diaria y snapshot final actual.
- `store_business_day_events` para eventos `open`, `close` y `reopen`.
- `opening_cash_amount`.
- `expected_cash_amount`.
- `counted_cash_amount` opcional.
- `skip_cash_count` para cierre rapido sin conteo fisico.
- `cash_difference_amount`.
- Snapshot final por metodo de pago.
- Totales finales de movimientos de caja en cierre:
  - `closing_cash_movements_in_total`
  - `closing_cash_movements_out_total`
  - `closing_cash_movements_count`
- `cash_movements` append-only con anulacion logica.
- Preview de cierre owner-only.
- Reporte actual e historico de cierres owner-only.
- Re-cierre recalcula y sobreescribe el snapshot final.
- Consultas de cierre scoped por `store_id`.
- Endpoints nuevos de caja protegidos por rol owner y tienda autenticada.

Limitaciones actuales:

- No existe historial inmutable de snapshots de cierre.
- `store_business_days` conserva solo el ultimo resultado del cierre.
- `store_business_day_events` registra la accion, pero no guarda todos los totales del cierre.
- No hay endpoint dedicado para descargar el cierre en CSV.
- No hay endpoint para listar intentos de cierre de una misma jornada.
- No hay soporte de impresion como salida formal.
- No hay forma facil de comparar cierre #1 vs cierre #2 tras una reapertura.

### Web

Ya implementado:

- Ajustes permite abrir con caja inicial.
- Ajustes permite cerrar con conteo o `Sin conteo`.
- Ajustes muestra preview de cierre.
- Reportes tiene `Cierres diarios`.
- Reporte de cierre muestra ventas, metodos de pago, efectivo esperado, efectivo contado, diferencia, movimientos de caja y formulas.
- Reportes tiene `Movimientos de caja`.
- Accesos de UI se apoyan en permisos de owner para acciones sensibles.

Limitaciones actuales:

- No hay boton visible de `Imprimir cierre`.
- No hay boton visible de `Exportar CSV` para el cierre.
- No hay vista de historial de re-cierres.
- No hay layout optimizado para papel.
- No hay una salida compacta que el owner pueda compartir o archivar.

## Decision Principal Sprint 5

Crear snapshots inmutables por cada cierre exitoso y agregar salidas operativas de reporte.

Decision recomendada:

```text
store_business_days = estado final actual de la jornada
store_day_close_snapshots = historial append-only de cada cierre exitoso
store_business_day_events = timeline de acciones operativas
cash_movements = detalle de movimientos manuales de efectivo
```

Razon:

- Mantiene compatibilidad con el modelo actual.
- Evita romper reportes existentes que leen el ultimo snapshot desde `store_business_days`.
- Permite auditoria sin cambiar el flujo operativo de cerrar/reabrir.
- Hace que un re-cierre no borre evidencia del cierre anterior.
- Mantiene el sistema simple para tiendas pequenas.

No crear PDF server-side en Sprint 5.

Razon:

- Agrega dependencias pesadas y problemas de runtime.
- Para el caso actual, `window.print()` con CSS de impresion y CSV cubren la necesidad operativa.
- PDF puede quedar para un sprint futuro si se necesita enviar por WhatsApp/email como archivo formal.

## Modelo de Datos Recomendado

### Nueva tabla `store_day_close_snapshots`

```text
store_day_close_snapshots
  id uuid primary key
  store_id uuid not null references stores(id)
  business_day_id uuid not null references store_business_days(id)
  close_sequence integer not null
  closed_by_user_id uuid not null references users(id)
  closing_note varchar(255) null
  opening_cash_amount numeric(12,2) not null default 0
  expected_cash_amount numeric(12,2) not null default 0
  counted_cash_amount numeric(12,2) null
  skip_cash_count boolean not null default false
  cash_difference_amount numeric(12,2) null
  sales_total numeric(12,2) not null default 0
  sales_count integer not null default 0
  voided_sales_count integer not null default 0
  items_count integer not null default 0
  cash_sales_total numeric(12,2) not null default 0
  qr_sales_total numeric(12,2) not null default 0
  transfer_sales_total numeric(12,2) not null default 0
  card_sales_total numeric(12,2) not null default 0
  cash_movements_in_total numeric(12,2) not null default 0
  cash_movements_out_total numeric(12,2) not null default 0
  cash_movements_count integer not null default 0
  closed_at timestamptz not null
  created_at timestamptz not null
```

### Constraints e indices

```text
unique(store_id, business_day_id, close_sequence)
index store_day_close_snapshots(store_id, business_day_id, closed_at)
index store_day_close_snapshots(store_id, closed_at)
index store_day_close_snapshots(business_day_id, close_sequence)
```

Notas:

- `amount` fields deben usar `numeric(12,2)` como el resto del modulo.
- `close_sequence` empieza en `1` por jornada.
- El siguiente `close_sequence` se calcula en backend dentro de la transaccion de cierre.
- La tabla es append-only. No se actualizan snapshots previos.
- Si el cierre falla por validacion o error de negocio, no se crea snapshot.

## Reglas de Negocio

### Cierre exitoso

Al cerrar una jornada:

1. Calcular preview/totales del cierre.
2. Actualizar `store_business_days` con el snapshot final actual.
3. Insertar fila en `store_day_close_snapshots` con los mismos totales.
4. Insertar evento `close` en `store_business_day_events`.
5. Confirmar todo en la misma transaccion.

### Reapertura

Al reabrir una jornada:

- No borrar snapshots.
- No modificar snapshots anteriores.
- Insertar evento `reopen`.
- Mantener `store_business_days` como la jornada reabierta con sus campos de cierre historicos hasta que se vuelva a cerrar, o limpiar solo los campos que el flujo actual ya limpie si esa es la regla existente.

### Re-cierre

Al cerrar nuevamente una jornada reabierta:

- Crear `close_sequence = ultimo + 1`.
- Actualizar `store_business_days` con el resultado mas reciente.
- Conservar snapshots anteriores.
- El reporte principal debe mostrar el ultimo cierre.
- El historial debe mostrar todos los cierres de la jornada.

### Conteo omitido

Si `skip_cash_count = true`:

- `counted_cash_amount = null`.
- `cash_difference_amount = null`.
- UI debe mostrar `Efectivo contado: Sin conteo`.
- CSV debe exportar `Sin conteo` en lugar de `0`, para no confundir "no contado" con "caja contada en cero".

### Seguridad y permisos

Todos los endpoints de Sprint 5 deben cumplir:

- Owner-only para ver historial de cierres, exportar CSV e imprimir desde UI.
- Siempre resolver `store_id` desde el usuario autenticado.
- Nunca aceptar `store_id` del cliente para filtrar datos.
- Validar que `business_day_id` pertenece al `store_id` autenticado.
- No exponer cierres de otra tienda aunque el usuario adivine un UUID.
- Mantener respuestas 403/404 consistentes con el resto del backend.

## Endpoints Recomendados

### Listar snapshots de cierre

```http
GET /api/v1/store-day/reports/{business_day_id}/snapshots
```

Reglas:

- Owner-only.
- `business_day_id` debe pertenecer al `store_id` autenticado.
- Ordenar por `close_sequence asc`.
- Devolver lista vacia solo si la jornada existe y no tiene cierres guardados.
- Si la jornada no pertenece al store autenticado, responder como recurso no disponible.

Respuesta sugerida:

```json
{
  "items": [
    {
      "id": "uuid",
      "business_day_id": "uuid",
      "close_sequence": 1,
      "closed_at": "2026-05-22T22:10:00Z",
      "closed_by_user_id": "uuid",
      "sales_total": "420.00",
      "expected_cash_amount": "185.00",
      "counted_cash_amount": null,
      "skip_cash_count": true,
      "cash_difference_amount": null,
      "cash_movements_in_total": "50.00",
      "cash_movements_out_total": "25.00",
      "cash_movements_count": 2
    }
  ]
}
```

### Exportar cierre CSV

```http
GET /api/v1/store-day/reports/{business_day_id}/export.csv
```

Reglas:

- Owner-only.
- `business_day_id` debe pertenecer al `store_id` autenticado.
- Exporta el ultimo cierre disponible.
- Si se requiere un snapshot especifico, soportar opcionalmente:

```http
GET /api/v1/store-day/reports/{business_day_id}/export.csv?snapshot_id=uuid
```

CSV recomendado:

```text
Campo,Valor
Tienda,Nombre de tienda
Fecha operativa,2026-05-22
Estado,closed
Cierre #,2
Ventas total,420.00
Ventas efectivo,160.00
Ventas QR,180.00
Ventas transferencia,80.00
Ventas tarjeta,0.00
Entradas caja,50.00
Salidas caja,25.00
Caja inicial,0.00
Efectivo esperado,185.00
Efectivo contado,Sin conteo
Diferencia,Sin conteo
Formula efectivo esperado,Caja inicial + ventas efectivo + entradas caja - salidas caja
```

## Backend Scope

### Nuevos archivos probables

```text
apps/backend/src/domain/entities/store_day_close_snapshot.py
apps/backend/src/domain/repositories/store_day_close_snapshot_repository.py
apps/backend/src/application/dto/store_day_close_snapshot_dto.py
apps/backend/src/application/use_cases/store_day/list_close_snapshots.py
apps/backend/src/application/use_cases/store_day/export_close_report_csv.py
apps/backend/src/infrastructure/database/models/store_day_close_snapshot_model.py
apps/backend/src/infrastructure/database/repositories/sqlalchemy_store_day_close_snapshot_repository.py
apps/backend/src/infrastructure/database/alembic/versions/014_create_store_day_close_snapshots.py
```

### Archivos a modificar

```text
apps/backend/src/application/use_cases/store_day/close_store_day.py
apps/backend/src/application/dto/store_day_dto.py
apps/backend/src/infrastructure/database/models/__init__.py
apps/backend/src/infrastructure/database/repositories/__init__.py
apps/backend/src/presentation/api/v1/routes/store_day.py
apps/backend/src/presentation/api/v1/routes/exports.py
apps/backend/src/infrastructure/dependencies.py
```

### Implementacion recomendada

- Crear repositorio de snapshots con:
  - `create(snapshot)`
  - `list_by_business_day(store_id, business_day_id)`
  - `get_latest_for_business_day(store_id, business_day_id)`
  - `get_next_sequence(store_id, business_day_id)`
- En `close_store_day.py`, guardar snapshot en la misma unidad de trabajo que actualiza `store_business_days`.
- Evitar que el export construya CSV desde SQL crudo. Usar use case y DTOs para preservar reglas de negocio.
- Mantener serializacion decimal consistente con endpoints actuales.
- Usar `StreamingResponse` o respuesta texto con `text/csv; charset=utf-8`.
- Agregar `Content-Disposition` con nombre estable:

```text
store-day-close-YYYY-MM-DD.csv
```

## Web Scope

### Nuevos archivos probables

```text
apps/web/src/features/store-day/components/CloseReportActions.tsx
apps/web/src/features/store-day/components/CloseSnapshotsHistory.tsx
apps/web/src/features/store-day/api/get-close-snapshots.ts
apps/web/app/api/store-day/reports/[businessDayId]/export.csv/route.ts
```

### Archivos a modificar

```text
apps/web/app/(app)/dashboard/reports/store-days/[businessDayId]/page.tsx
apps/web/src/features/store-day/components/StoreDayCloseReportView.tsx
apps/web/src/features/store-day/types.ts
apps/web/src/lib/auth/permissions.ts
```

### UI recomendada

En la pagina de detalle de cierre:

- Mostrar acciones arriba del reporte:
  - `Imprimir cierre`
  - `Exportar CSV`
- Mostrar estado de conteo:
  - `Efectivo contado: Sin conteo` cuando aplique.
- Mostrar bloque pequeno de formulas:
  - `Ventas = ventas completadas de la jornada`
  - `Efectivo esperado = caja inicial + ventas en efectivo + entradas caja - salidas caja`
  - `Diferencia = efectivo contado - efectivo esperado`
- Mostrar seccion `Historial de cierres`:
  - Cierre #.
  - Fecha/hora de cierre.
  - Ventas.
  - Efectivo esperado.
  - Efectivo contado o `Sin conteo`.
  - Diferencia o `Sin conteo`.

### Print CSS

Agregar estilos de impresion en el componente o CSS global existente:

```css
@media print {
  .no-print {
    display: none !important;
  }

  .print-report {
    color: #111827;
    background: #ffffff;
  }
}
```

Reglas:

- Ocultar sidebar/nav/actions al imprimir.
- Mantener formulas visibles.
- Evitar dependencias nuevas de PDF.
- Usar un componente cliente pequeno solo para llamar `window.print()`.

### Control frontend

- No renderizar acciones de export/print para roles sin permiso.
- No depender solo de UI: backend sigue siendo la autoridad.
- Si el route handler web proxya la descarga, debe reenviar cookies/token de sesion como lo hacen otros endpoints autenticados.
- Si el usuario no tiene permiso, mostrar estado vacio o redirigir segun el patron existente de reportes.

## Tests Requeridos

### Backend

Agregar tests de integracion:

- Cerrar jornada crea snapshot #1.
- Reabrir y cerrar nuevamente crea snapshot #2.
- El reporte principal usa el ultimo cierre.
- El historial conserva ambos cierres.
- Cashier no puede listar snapshots.
- Cashier no puede exportar cierre CSV.
- Owner no puede acceder a cierre de otra tienda.
- Export CSV incluye:
  - ventas por metodo de pago.
  - entradas/salidas de caja.
  - formula de efectivo esperado.
  - `Sin conteo` cuando `skip_cash_count = true`.
- Export CSV no filtra por `store_id` recibido del cliente.
- Cierre con cash movements queda reflejado en snapshot.

### Web

Agregar o actualizar tests:

- La pagina de reporte muestra botones `Imprimir cierre` y `Exportar CSV` para owner.
- Las acciones no aparecen para rol sin permiso.
- `Efectivo contado: Sin conteo` se renderiza correctamente.
- El historial de cierres muestra multiples snapshots.
- El link de export construye la URL correcta.
- Las formulas siguen visibles en el reporte.

## Validacion Manual Recomendada

Flujo completo:

1. Abrir tienda con caja inicial.
2. Registrar venta en efectivo.
3. Registrar venta QR o transferencia.
4. Registrar entrada de caja.
5. Registrar gasto o retiro.
6. Cerrar con `Sin conteo`.
7. Ver reporte de cierre.
8. Exportar CSV.
9. Imprimir cierre.
10. Reabrir jornada.
11. Registrar o anular algo permitido por el flujo actual.
12. Cerrar nuevamente.
13. Confirmar que el historial muestra cierre #1 y cierre #2.
14. Confirmar que el reporte principal muestra el ultimo cierre.

## Criterios de Aceptacion

Sprint 5 se considera completo cuando:

- Cada cierre exitoso crea un snapshot append-only.
- Re-cerrar una jornada no borra ni modifica snapshots anteriores.
- El reporte principal sigue funcionando con el ultimo cierre.
- Existe endpoint owner-only para listar historial de cierres.
- Existe export CSV owner-only y scoped por `store_id`.
- La UI de reporte permite imprimir y exportar.
- La UI muestra historial de cierres cuando hay mas de un cierre.
- `Sin conteo` se diferencia de `0`.
- Las formulas principales son visibles en pantalla y export.
- Hay tests backend para seguridad multi-store y roles.
- Hay tests frontend para visibilidad de acciones y render de historial.

## Fuera de Alcance

- PDF server-side.
- Envio por email o WhatsApp.
- Firma digital del cierre.
- Reporte fiscal/impositivo.
- Multiples cajas por tienda.
- Turnos por cajero.
- Conciliacion bancaria automatica.
- Dashboard analitico avanzado de diferencias de caja.

## Riesgos y Mitigaciones

### Riesgo: duplicar logica de calculo

Mitigacion:

- El snapshot debe usar el mismo resultado de calculo que actualiza `store_business_days`.
- No recalcular totales de forma separada para export.

### Riesgo: leak multi-store

Mitigacion:

- Todos los repositorios de lectura reciben `store_id`.
- Tests negativos con UUID de otra tienda.

### Riesgo: CSV inconsistente con UI

Mitigacion:

- Usar DTO comun de reporte/snapshot.
- Mantener etiquetas de formulas en un lugar simple y testeado.

### Riesgo: print layout rompe la app shell

Mitigacion:

- Usar clases `no-print` y `print-report`.
- Validar manualmente en desktop y mobile antes de cerrar sprint.

## Recomendacion de Implementacion

Orden recomendado:

1. Backend migration + modelo + repositorio de snapshots.
2. Integrar snapshot creation en `close_store_day.py`.
3. Endpoint de historial de snapshots.
4. Endpoint export CSV.
5. Tests backend de cierre, re-cierre, permisos y multi-store.
6. Web API client + route handler de export si aplica.
7. UI de acciones print/export.
8. UI de historial de cierres.
9. Tests web.
10. Validacion manual completa.

Este orden reduce riesgo porque primero asegura que la fuente de verdad historica existe y esta protegida. Luego la UI solo consume datos ya auditables.
