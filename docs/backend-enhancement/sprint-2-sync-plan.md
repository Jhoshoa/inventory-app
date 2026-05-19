# Sprint 2 Sync MVP Plan

Fecha: 2026-05-19

## Objetivo

Definir e implementar un contrato de sincronizacion offline-first estable para mobile/web sin rehacer el backend despues. El Sprint 1 dejo la base: tenant isolation por `store_id`, ventas transaccionales y `stock_movements`. Sprint 2 debe convertir `/sync/push` y `/sync/pull` en una API tipada, idempotente y segura para productos, ventas y movimientos de stock.

## Principios

- El servidor acepta cambios solo dentro del `store_id` del usuario autenticado.
- El cliente genera IDs offline con UUID y envia cambios cuando tenga conexion.
- `sync/push` debe ser idempotente por `client_change_id`; reenviar el mismo cambio no duplica ventas, productos ni movimientos.
- Ventas son append-only. No se editan ventas sincronizadas; se anulan con estado o movimiento inverso en un sprint posterior.
- Stock se sincroniza por deltas (`stock_movements`), no por sobrescritura ciega de `products.stock`.
- Productos usan merge simple: last-write-wins para campos no criticos, con `server_version` y `server_updated_at`.
- El contrato debe ser explicito en DTOs Pydantic, no `list[dict]`.

## Estado Actual

`/api/v1/sync/push` hoy acepta:

```json
{ "changes": [{ "entity": "product", "operation": "upsert", "data": {} }] }
```

Limitaciones:

- DTOs no tipados (`list[dict]`).
- No hay `device_id`.
- No hay `client_change_id`.
- No hay idempotencia.
- Solo soporta `product`.
- No devuelve resultado por cambio.
- `pull` devuelve lista flexible, sin forma estable por entidad.
- No replica `stock_movements`.

## Alcance Incluido

- Redisenar DTOs de sync push/pull.
- Crear tabla `sync_changes` para idempotencia y trazabilidad.
- Soportar push de:
  - `product.upsert`
  - `product.delete`
  - `sale.create`
  - `stock_movement.create`
- Soportar pull incremental de:
  - products
  - sales con items
  - stock_movements
- Agregar estado por cambio: `accepted`, `duplicate`, `rejected`, `conflict`.
- Agregar tests de idempotencia, tenant isolation, ventas offline y pull incremental.
- Documentar contrato compatible con mobile offline/WatermelonDB.

## Fuera de Alcance

- Sync de fotos/OCR.
- UI de resolucion de conflictos.
- Background workers o retry server-side.
- Compresion/batching avanzado.
- Purga automatica de tombstones.
- Multi-store por usuario.

## Migracion Necesaria

Crear `sync_changes`:

```sql
sync_changes (
  id uuid primary key,
  store_id uuid not null references stores(id),
  device_id varchar(100) not null,
  client_change_id varchar(120) not null,
  entity varchar(40) not null,
  operation varchar(40) not null,
  entity_id uuid not null,
  status varchar(30) not null,
  error_code varchar(60),
  error_detail text,
  server_version integer,
  server_updated_at timestamptz,
  client_created_at timestamptz not null,
  processed_at timestamptz not null default now(),
  unique (store_id, device_id, client_change_id)
)
```

Indices:

- `ix_sync_changes_store_device`
- `ix_sync_changes_store_processed_at`
- `ix_sync_changes_entity`

Considerar tambien:

- Agregar `updated_at` a `stock_movements` si se decide usar un campo unico para pull. Alternativa inicial: usar `created_at`.
- Confirmar que `products.updated_at`, `sales.updated_at` y `stock_movements.created_at` esten indexados por `store_id`.

## Contrato de Push

Endpoint:

```http
POST /api/v1/sync/push
```

Request:

```json
{
  "device_id": "device-abc",
  "changes": [
    {
      "client_change_id": "local-change-001",
      "entity": "product",
      "operation": "upsert",
      "entity_id": "5a3f...",
      "client_created_at": "2026-05-19T12:00:00Z",
      "payload": {
        "name": "Arroz 1kg",
        "price": "12.50",
        "stock": 10,
        "category": "Abarrotes",
        "min_stock": 5,
        "unit": "unidad"
      }
    }
  ]
}
```

Response:

```json
{
  "results": [
    {
      "client_change_id": "local-change-001",
      "entity": "product",
      "operation": "upsert",
      "entity_id": "5a3f...",
      "status": "accepted",
      "server_version": 2,
      "server_updated_at": "2026-05-19T12:00:04Z",
      "error": null
    }
  ],
  "server_time": "2026-05-19T12:00:05Z"
}
```

Statuses:

- `accepted`: cambio aplicado.
- `duplicate`: `client_change_id` ya procesado; devolver resultado anterior.
- `rejected`: payload invalido, entidad no soportada o regla de negocio violada.
- `conflict`: cambio no aplicado por version/ownership/estado incompatible.

## Contrato de Pull

Endpoint:

```http
POST /api/v1/sync/pull
```

Request:

```json
{
  "device_id": "device-abc",
  "since": "2026-05-19T00:00:00Z"
}
```

Response:

```json
{
  "changes": [
    {
      "entity": "product",
      "operation": "upsert",
      "entity_id": "5a3f...",
      "server_version": 2,
      "server_updated_at": "2026-05-19T12:00:04Z",
      "payload": {}
    }
  ],
  "server_time": "2026-05-19T12:00:05Z"
}
```

Reglas:

- `since` es inclusivo con margen defensivo o exclusivo documentado. Recomendado: `updated_at > since`, y el cliente guarda `server_time` como proximo cursor.
- Pull nunca devuelve datos de otra tienda.
- Pull debe incluir tombstones (`operation=delete`) para productos con `deleted_at`.
- Pull de ventas usa `created_at/updated_at`; ventas no se editan salvo estado.
- Pull de stock movements usa `created_at`.

## Entidades y Operaciones

### Product Upsert

Payload permitido:

- `name`
- `price`
- `stock` solo para carga inicial o correccion completa antes de vender.
- `category`
- `min_stock`
- `unit`
- `sku`
- `cost_price`
- `photo_url`
- `qr_code`

Reglas:

- Crear producto con `store_id` del token.
- Si existe en otra tienda, responder `conflict` o `rejected`; nunca modificar.
- Para cambios posteriores de stock, preferir `stock_movement.create`.

### Product Delete

Payload vacio o con metadata opcional.

Reglas:

- Soft delete con `deleted_at`.
- Pull replica tombstone.
- Si producto no existe en la tienda, devolver `rejected` o `duplicate` si el cambio ya fue procesado.

### Sale Create

Payload:

```json
{
  "payment_method": "efectivo",
  "device_id": "device-abc",
  "customer_name": null,
  "items": [
    { "product_id": "uuid", "quantity": 2, "unit_price": "12.50" }
  ],
  "created_at": "2026-05-19T12:00:00Z"
}
```

Reglas:

- Usar el mismo caso de uso transaccional de ventas o una variante dedicada para sync.
- Validar productos por `store_id`.
- Si no hay stock suficiente en servidor, devolver `conflict` con detalle.
- Si se reenvia el mismo `client_change_id`, no crear otra venta.
- Si se reenvia el mismo `entity_id` de venta con otro `client_change_id`, devolver `duplicate` o `conflict` segun decision final.

### Stock Movement Create

Payload:

```json
{
  "product_id": "uuid",
  "quantity_delta": -2,
  "movement_type": "sale",
  "reason": "offline sale",
  "created_at": "2026-05-19T12:00:00Z"
}
```

Reglas:

- Para ventas, preferir que el movimiento sea creado por `sale.create`, no enviado aparte, para evitar doble descuento.
- Para ajuste manual offline, aceptar `movement_type=manual_adjustment`.
- Aplicar delta con validacion de stock no negativo.
- Registrar `device_id`.

## Archivos Principales a Tocar

- `apps/backend/src/application/dto/sync_dto.py`
- `apps/backend/src/domain/repositories/sync_repository.py`
- `apps/backend/src/infrastructure/database/repositories/sync_repository.py`
- `apps/backend/src/infrastructure/database/models/sync_change_model.py`
- `apps/backend/src/infrastructure/database/models/stock_movement_model.py`
- `apps/backend/src/infrastructure/database/alembic/versions/004_create_sync_changes.py`
- `apps/backend/src/application/use_cases/sync/sync_push.py`
- `apps/backend/src/application/use_cases/sync/sync_pull.py`
- `apps/backend/src/presentation/api/v1/sync.py`
- `apps/backend/tests/integration/test_sync.py` o separar desde `test_api.py`

## Implementacion Recomendada

### 1. DTOs tipados

Usar enums:

- `SyncEntity`: `product`, `sale`, `stock_movement`
- `SyncOperation`: `upsert`, `delete`, `create`
- `SyncResultStatus`: `accepted`, `duplicate`, `rejected`, `conflict`

DTOs:

- `SyncChangeDTO`
- `SyncPushDTO`
- `SyncChangeResultDTO`
- `SyncPushResponseDTO`
- `SyncPullDTO`
- `SyncPullChangeDTO`
- `SyncPullResponseDTO`

### 2. Idempotencia

Flujo:

1. Buscar `sync_changes` por `(store_id, device_id, client_change_id)`.
2. Si existe, devolver `duplicate` con metadata guardada.
3. Si no existe, procesar cambio en la misma sesion.
4. Registrar resultado en `sync_changes`.
5. Si el cambio falla por regla de negocio, guardar `rejected/conflict` y continuar con el resto del batch.

### 3. Procesamiento por entidad

Mantener funciones privadas pequenas:

- `_apply_product_upsert`
- `_apply_product_delete`
- `_apply_sale_create`
- `_apply_stock_movement_create`
- `_serialize_product_pull`
- `_serialize_sale_pull`
- `_serialize_stock_movement_pull`

Evitar un metodo enorme de `push_changes`.

### 4. Errores por cambio

No fallar todo el batch por un cambio invalido, salvo errores de autenticacion o payload global invalido.

Ejemplo:

```json
{
  "client_change_id": "c2",
  "status": "rejected",
  "error": {
    "code": "product_not_found",
    "detail": "Producto no encontrado"
  }
}
```

## Tests Requeridos

Crear o ampliar tests de integracion:

1. `test_sync_push_product_upsert_returns_result`
   - Envia producto nuevo.
   - Recibe `accepted`.
   - Pull devuelve producto.

2. `test_sync_push_is_idempotent_by_client_change_id`
   - Envia el mismo cambio dos veces.
   - Primer resultado `accepted`, segundo `duplicate`.
   - Solo existe un producto/venta/movimiento.

3. `test_sync_push_sale_create_reduces_stock_once`
   - Crea producto con stock.
   - Push `sale.create`.
   - Stock baja una vez.
   - Repetir mismo cambio no baja stock de nuevo.

4. `test_sync_push_rejects_cross_store_product`
   - Producto existe en tienda A.
   - Usuario tienda B intenta modificarlo.
   - Resultado `conflict` o `rejected`; producto no cambia.

5. `test_sync_pull_includes_products_sales_and_stock_movements`
   - Crear producto, venta y movimiento.
   - Pull desde fecha pasada.
   - Respuesta incluye las tres entidades.

6. `test_sync_pull_does_not_leak_other_store_data`
   - Crear datos en dos tiendas.
   - Pull de tienda A no contiene tienda B.

7. `test_sync_push_batch_continues_after_invalid_change`
   - Batch con un cambio invalido y uno valido.
   - Valido se aplica; invalido devuelve `rejected`.

8. `test_sync_push_manual_stock_adjustment_records_movement`
   - Push `stock_movement.create` con delta positivo/negativo.
   - Stock cambia y movimiento queda registrado.

## Validaciones Manuales

Con Postgres local:

```powershell
cd apps/backend
docker compose up -d db
python -m alembic upgrade head
python -m pytest tests -q -p no:cacheprovider
python -m ruff check src tests --no-cache
```

Probar `sync/push` con un batch pequeno desde Swagger o HTTP client.

## Criterios de Aceptacion

- `sync/push` y `sync/pull` usan DTOs tipados.
- Cada cambio push devuelve resultado individual.
- Reintentar el mismo `client_change_id` no duplica efectos.
- Ventas offline reducen stock una sola vez.
- Ajustes offline crean `stock_movements`.
- Pull incremental devuelve productos, ventas y movimientos.
- No hay fuga de datos entre tiendas.
- Tests nuevos pasan.
- `alembic upgrade head` funciona en PostgreSQL local.
- OpenAPI expone el contrato sin `dict` ambiguos.

## Riesgos y Decisiones Abiertas

- **WatermelonDB exact shape:** este sprint define un contrato propio compatible; al conectar mobile puede requerir adaptador.
- **Stock insuficiente al sincronizar venta offline:** para v1, devolver `conflict` y dejar que el cliente muestre correccion manual. No inventar stock negativo silencioso.
- **Mismo `entity_id`, distinto `client_change_id`:** decidir si se considera duplicate por entidad o conflict. Recomendado: conflict para evitar doble venta accidental.
- **Versionado por campo:** no implementar CRDT ni merge por campo en Sprint 2; dejar `server_version` para evolucionar.
- **Orden del batch:** procesar en orden recibido. El cliente debe enviar cambios dependientes en orden: producto antes de venta.

## Resultado Esperado

Al terminar Sprint 2, mobile puede construir una cola local simple:

1. Crear/editar producto offline.
2. Registrar venta offline.
3. Ajustar stock offline.
4. Enviar cambios con `client_change_id`.
5. Reintentar sin duplicar.
6. Descargar cambios del servidor por `server_time`.

Esto deja lista la base para Sprint 3: QR, busqueda operativa, dashboard y reportes.
