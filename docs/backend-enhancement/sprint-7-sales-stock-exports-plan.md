# Sprint 7 Sales, Stock History and Exports Plan

Fecha: 2026-05-19

## Objetivo

Cerrar los huecos operativos que aparecen apenas una tienda empieza a usar el POS: anular ventas equivocadas, consultar por que cambio el stock y exportar datos basicos. Este sprint debe ser corto y enfocado para dejar el backend listo para que frontend construya pantallas reales sin bloquearse.

## Principios

- Las ventas siguen siendo append-only: no se borran; se anulan con estado y movimientos inversos.
- Todo ajuste de stock debe quedar en `stock_movements`.
- Todo endpoint sigue filtrado por `store_id`.
- Las operaciones administrativas requieren `owner` cuando afecten auditoria o exportacion sensible.
- CSV debe ser simple, estable y consumible por Excel/Google Sheets.
- No agregar tablas si los modelos actuales alcanzan.

## Estado Actual

### Ya existe

- `sales` y `sale_items` guardan ventas completadas.
- `stock_movements` audita ventas, ajustes manuales e imports.
- `SaleModel.status` existe y hoy se usa como `completed`.
- `SaleModel.deleted_at` existe, pero no debe usarse para anulaciones normales.
- `GET /sales`, `POST /sales`, `GET /sales/{id}` existen.
- `GET /reports/sales` ya entrega resumen por rango.
- Productos tienen busqueda, paginacion, QR y stock bajo.
- Roles `owner/cashier` existen.

### Falta

- Endpoint para anular venta y devolver stock.
- Campo o metadata minima para razon de anulacion.
- Listado de movimientos de stock por producto.
- Listado global de movimientos de stock por rango.
- Export CSV de productos.
- Export CSV de ventas.
- Export CSV de movimientos de stock.
- Tests de idempotencia de anulacion y tenant isolation.

## Alcance Incluido

- Agregar `POST /sales/{sale_id}/void`.
- Agregar DTO `VoidSaleDTO`.
- Agregar use case `VoidSaleUseCase`.
- Agregar metodos de repositorio para marcar venta anulada.
- Registrar movimientos `sale_void` por cada item anulado.
- Agregar endpoints de stock movements:
  - `GET /products/{product_id}/stock-movements`
  - `GET /stock-movements`
- Agregar exports CSV:
  - `GET /exports/products.csv`
  - `GET /exports/sales.csv`
  - `GET /exports/stock-movements.csv`
- Agregar tests de anulacion, stock history, exports y permisos.

## Fuera de Alcance

- Devoluciones parciales por item.
- Reimpresion de recibos.
- Notas de credito fiscales.
- Export PDF.
- Reportes contables avanzados.
- Background export jobs.

## API Propuesta

### Anular Venta

```http
POST /api/v1/sales/{sale_id}/void
```

Payload:

```json
{
  "reason": "Cliente cancelo la compra"
}
```

Respuesta:

```json
{
  "id": "uuid",
  "status": "voided",
  "total": "125.00",
  "items": []
}
```

Reglas:

- Requiere usuario activo. Recomendado: `owner`.
- Solo se puede anular venta `completed`.
- Si ya esta `voided`, devolver `409 conflict`.
- Debe devolver stock por cada item.
- Registrar `stock_movements.movement_type = "sale_void"`.
- `quantity_delta` positivo con la cantidad devuelta.
- `reason` debe guardarse en cada movimiento.
- No usar `deleted_at` para anulacion normal.
- Actualizar `sales.status = "voided"` y `updated_at`.

### Historial por Producto

```http
GET /api/v1/products/{product_id}/stock-movements?limit=50&offset=0
```

Respuesta:

```json
{
  "items": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "sale_id": "uuid",
      "movement_type": "sale",
      "quantity_delta": -2,
      "stock_after": 8,
      "reason": null,
      "device_id": "pos-1",
      "created_at": "2026-05-19T..."
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

Reglas:

- Producto debe pertenecer al `store_id`.
- Orden `created_at desc`.
- No mostrar movimientos de otra tienda.

### Historial Global de Stock

```http
GET /api/v1/stock-movements?product_id=&type=&from=&to=&limit=50&offset=0
```

Filtros:

- `product_id`
- `type`: `sale`, `sale_void`, `manual_adjustment`, `import`, `stock_movement`
- `from`
- `to`
- `limit`, `offset`

Reglas:

- Filtrar siempre por `store_id`.
- Rango maximo sugerido: 90 dias.
- Orden `created_at desc`.

## Export CSV

### Productos

```http
GET /api/v1/exports/products.csv
```

Columnas:

```text
id,name,category,sku,unit,price,cost_price,stock,min_stock,qr_code,is_active
```

Reglas:

- Owner recomendado.
- Excluir `deleted_at`.
- Orden por `name`.

### Ventas

```http
GET /api/v1/exports/sales.csv?from=&to=
```

Columnas:

```text
id,created_at,status,payment_method,total,items_count,customer_name,device_id
```

Reglas:

- Rango maximo 90 dias.
- Incluir ventas `completed` y `voided`.
- No incluir ventas soft-deleted.

### Movimientos de Stock

```http
GET /api/v1/exports/stock-movements.csv?from=&to=
```

Columnas:

```text
id,created_at,product_id,sale_id,movement_type,quantity_delta,stock_after,reason,device_id
```

Reglas:

- Rango maximo 90 dias.
- Owner recomendado.

## Cambios de Datos

No se requieren tablas nuevas.

Revisar migracion `008` solo si hace falta:

- Indice `sales(store_id, status, created_at)`.
- Indice `stock_movements(store_id, product_id, created_at)`.
- Opcional: `sales.voided_at timestamptz`.
- Opcional: `sales.void_reason varchar(200)`.

Decision recomendada:

- Agregar `voided_at` y `void_reason` para auditoria clara.
- Mantener los movimientos como fuente principal del stock devuelto.

## Use Cases

Crear:

- `VoidSaleUseCase`
- `ListStockMovementsUseCase`
- `ListProductStockMovementsUseCase`
- `ExportProductsCsvUseCase`
- `ExportSalesCsvUseCase`
- `ExportStockMovementsCsvUseCase`

Responsabilidades:

- Use cases manejan reglas de negocio.
- Repositorios hacen consultas filtradas por `store_id`.
- Routers solo parsean DTO/query params y devuelven respuestas.

## Repositorios

### `ISaleRepository`

Agregar:

- `void_sale(store_id, sale_id, reason) -> Sale`
- `list_for_export(store_id, from_date, to_date) -> list[SaleExportRow]`

### `IProductRepository`

Puede reutilizar `search` para export o agregar:

- `list_for_export(store_id) -> list[Product]`

### Nuevo `IStockMovementRepository`

Metodos:

- `list_by_product(store_id, product_id, limit, offset) -> tuple[list, total]`
- `search(store_id, product_id, movement_type, from_date, to_date, limit, offset) -> tuple[list, total]`
- `list_for_export(store_id, from_date, to_date) -> list`

## Seguridad y Permisos

Recomendacion para v1:

- `POST /sales/{id}/void`: `owner`.
- `GET /stock-movements`: usuario activo.
- `GET /products/{id}/stock-movements`: usuario activo.
- Exports CSV: `owner`.

Razon:

- Cashier puede vender y consultar stock.
- Owner debe controlar anulaciones y extracciones masivas de datos.

## Tests Requeridos

### Anulacion

1. `test_void_sale_returns_stock_and_marks_sale_voided`
2. `test_void_sale_creates_sale_void_stock_movements`
3. `test_void_sale_is_rejected_when_already_voided`
4. `test_cashier_cannot_void_sale`
5. `test_void_sale_does_not_cross_store`

### Stock Movements

6. `test_product_stock_movements_returns_product_history`
7. `test_product_stock_movements_is_store_scoped`
8. `test_stock_movements_filters_by_type_and_range`

### Exports

9. `test_export_products_csv_returns_expected_columns`
10. `test_export_sales_csv_includes_voided_and_completed`
11. `test_export_stock_movements_csv_returns_expected_rows`
12. `test_cashier_cannot_export_csv`
13. `test_exports_do_not_leak_other_store`

### Validaciones

14. `test_export_sales_rejects_range_over_90_days`
15. `test_stock_movements_rejects_invalid_date_range`

## Validaciones Manuales

```powershell
cd apps/backend
python -m pytest tests -q -p no:cacheprovider
python -m ruff check src tests --no-cache
python -m alembic upgrade head
python -m alembic current
python -m scripts.export_openapi
```

Probar en Swagger:

- `POST /api/v1/sales/{sale_id}/void`
- `GET /api/v1/products/{product_id}/stock-movements`
- `GET /api/v1/stock-movements`
- `GET /api/v1/exports/products.csv`
- `GET /api/v1/exports/sales.csv`
- `GET /api/v1/exports/stock-movements.csv`

## Criterios de Aceptacion

- Una venta anulada devuelve stock de forma atomica.
- Anular una venta ya anulada no duplica stock.
- Cada devolucion por anulacion queda auditada.
- Se puede consultar historial de stock por producto.
- Se puede consultar historial global filtrado.
- Exports CSV entregan columnas estables.
- Exports y anulaciones respetan roles.
- No hay fugas multi-tenant.
- Tests, Ruff, Alembic y OpenAPI export pasan.

## Riesgos y Decisiones

- **Devolucion parcial:** queda fuera; anulacion total es suficiente para v1.
- **Stock negativo en anulacion:** no aplica porque anular devuelve stock.
- **Ventas offline ya sincronizadas:** si mobile envia venta y luego necesita correccion, inicialmente backend debe exponer void; sync de void puede venir despues.
- **CSV grande:** tiendas objetivo tienen alrededor de 1000 productos, respuesta sin background job es aceptable.
- **Anulacion por cashier:** restringir a owner reduce riesgo operativo inicial.

## Resultado Esperado

Al cerrar Sprint 7, el backend queda preparado para pantallas frontend de POS reales: ventas con correccion, inventario con explicacion de stock y exportes basicos para administracion. Despues de esto, la recomendacion es pasar a planificacion e implementacion del frontend web.
