# Sprint 3 Operations Plan

Fecha: 2026-05-19

## Objetivo

Hacer que el backend soporte la operacion diaria de una tienda: encontrar productos rapido, vender por QR/busqueda, mostrar stock bajo, entregar metricas basicas al dueno y habilitar reportes simples de ventas. Sprint 1 aseguro tenant isolation y stock auditado; Sprint 2 dejo sync offline tipado. Sprint 3 debe convertir esa base en endpoints ergonomicos para POS, dashboard y administracion.

## Principios

- Todo endpoint sigue filtrado por `store_id`.
- La lista de productos debe escalar comodamente a 1000 productos por tienda.
- QR debe ser un identificador operativo, no contener datos sensibles.
- Dashboard y reportes deben ser queries server-side reutilizables por web/mobile.
- Evitar nuevas tablas salvo que sean necesarias; usar `products`, `sales`, `sale_items`, `stock_movements` y `exchange_rates`.
- Los endpoints nuevos deben quedar cubiertos por tests de integracion.

## Estado Actual

### Ya existe

- CRUD basico de productos.
- Ajuste de stock con auditoria.
- Ventas con items y descuento de stock.
- Sync pull/push tipado.
- `qr_code`, `sku`, `cost_price`, `photo_url`, `category`, `min_stock` existen en modelo de producto.
- `sales` tiene `created_at`, `updated_at`, `items_count`, `subtotal`, `discount`, `total`, `payment_method`.

### Falta

- Busqueda/paginacion de productos.
- Filtros por categoria, stock bajo, sin stock y texto.
- Lookup por QR.
- Generacion automatica de `qr_code`.
- DTOs de producto que acepten `sku`, `cost_price`, `unit`, `photo_url`, `qr_code`.
- Endpoint compacto para POS.
- Dashboard summary.
- Reporte basico de ventas por rango.
- Endpoint de productos con stock bajo.

## Alcance Incluido

- Mejorar `GET /products` con query params.
- Agregar `GET /products/qr/{qr_code}`.
- Generar `qr_code` al crear producto cuando no venga.
- Agregar endpoint de productos bajos de stock.
- Agregar router `dashboard`.
- Agregar router `reports`.
- Agregar DTOs especificos para respuestas compactas y metricas.
- Agregar tests de busqueda, paginacion, QR, stock bajo, dashboard y reportes.

## Fuera de Alcance

- Impresion de etiquetas QR.
- Generacion de imagen PNG/SVG del QR.
- Reportes contables avanzados.
- Devoluciones/anulaciones de ventas.
- Export CSV/PDF.
- Busqueda full-text avanzada con Postgres `tsvector`.
- Integracion visual en web/mobile.

## API Propuesta

### Productos: busqueda y paginacion

Extender:

```http
GET /api/v1/products
```

Query params:

- `q`: busca por nombre, sku o qr_code.
- `category`: filtra por categoria exacta.
- `stock`: `all`, `available`, `low`, `out`.
- `limit`: default `50`, max `100`.
- `offset`: default `0`.
- `sort`: `name`, `stock`, `updated_at`, `price`.
- `direction`: `asc`, `desc`.

Respuesta recomendada:

```json
{
  "items": [],
  "total": 48,
  "limit": 50,
  "offset": 0
}
```

Decision de compatibilidad:

- Cambiar de `list[ProductResponseDTO]` a `ProductListResponseDTO` rompe clientes actuales pero es mejor para v1.
- Si se quiere evitar ruptura, crear `GET /products/search` y dejar `GET /products` como lista simple. Recomendacion: cambiar ahora antes de que web/mobile dependan fuerte del contrato.

### Productos: POS compacto

Endpoint opcional si el listado normal queda pesado:

```http
GET /api/v1/products/pos?q=&limit=&offset=
```

Respuesta compacta:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Arroz 1kg",
      "price": "12.50",
      "stock": 10,
      "unit": "unidad",
      "qr_code": "INV-..."
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

### Lookup por QR

```http
GET /api/v1/products/qr/{qr_code}
```

Reglas:

- Filtrar siempre por `store_id`.
- Retornar 404 si el QR pertenece a otra tienda o si el producto esta eliminado.
- QR debe ser unico. Recomendado para Sprint 3: mantener unique global por simplicidad.

### Stock bajo

```http
GET /api/v1/products/low-stock?limit=20
```

Regla:

- `stock <= min_stock`
- Excluir eliminados.
- Ordenar por `stock ASC`, luego `name ASC`.

### Dashboard summary

Nuevo router:

```http
GET /api/v1/dashboard/summary
```

Respuesta:

```json
{
  "sales_today_total": "1250.00",
  "sales_today_count": 8,
  "products_total": 48,
  "low_stock_count": 3,
  "out_of_stock_count": 1,
  "latest_sales": [],
  "low_stock_products": [],
  "exchange_rates": []
}
```

Notas:

- Usar timezone UTC inicialmente; documentar que en Sprint posterior se puede configurar timezone por tienda.
- `latest_sales`: ultimas 5 ventas.
- `low_stock_products`: top 5 por menor stock.
- `exchange_rates`: ultimos registros disponibles, no bloquear si esta vacio.

### Reporte de ventas

Nuevo router:

```http
GET /api/v1/reports/sales?from=2026-05-01T00:00:00Z&to=2026-05-19T23:59:59Z
```

Respuesta:

```json
{
  "from": "2026-05-01T00:00:00Z",
  "to": "2026-05-19T23:59:59Z",
  "total_sales": "3200.00",
  "sales_count": 35,
  "items_count": 90,
  "by_payment_method": [
    { "payment_method": "efectivo", "total": "2200.00", "count": 22 }
  ],
  "top_products": [
    { "product_id": "uuid", "product_name": "Arroz 1kg", "quantity": 20, "total": "250.00" }
  ]
}
```

Reglas:

- Rango maximo recomendado: 90 dias para v1.
- Si no se envia `from/to`, default: ultimos 7 dias.
- Excluir ventas con `deleted_at`.

## Cambios en Producto

### DTOs

Actualizar `CreateProductDTO`:

- `unit`
- `sku`
- `cost_price`
- `photo_url`
- `qr_code`

Actualizar `UpdateProductDTO`:

- `unit`
- `sku`
- `cost_price`
- `photo_url`
- `qr_code`

Agregar:

- `ProductListQueryDTO` o params directos en endpoint.
- `ProductListResponseDTO`
- `ProductCompactResponseDTO`

### QR

Formato recomendado:

```text
INV-{short_store_or_random}-{short_uuid}
```

Pero para no filtrar tienda ni introducir dependencia con store slug:

```text
P-{uuid4_hex_12}
```

Reglas:

- Si cliente envia `qr_code`, validar que no exista.
- Si no envia, generar en backend.
- En sync, permitir `qr_code` enviado por cliente; si colisiona, responder conflicto.
- Mantener `qr_code` como texto escaneable, no como imagen.

## Repositorios y Use Cases

### ProductRepository

Agregar metodos:

- `search(store_id, filters) -> tuple[list[Product], total]`
- `get_by_qr_code(store_id, qr_code) -> Product | None`
- `list_low_stock(store_id, limit) -> list[Product]`
- `count_by_store(store_id) -> int`
- `count_low_stock(store_id) -> int`
- `count_out_of_stock(store_id) -> int`

### SaleRepository

Agregar metodos:

- `summary_for_day(store_id, day_start, day_end)`
- `latest_sales(store_id, limit)`
- `sales_report(store_id, from_date, to_date)`
- `top_products(store_id, from_date, to_date, limit)`
- `totals_by_payment_method(store_id, from_date, to_date)`

### ExchangeRateRepository

Reusar `list_latest(limit)` para dashboard.

## Archivos Principales a Tocar

- `apps/backend/src/application/dto/product_dto.py`
- `apps/backend/src/application/dto/dashboard_dto.py`
- `apps/backend/src/application/dto/report_dto.py`
- `apps/backend/src/domain/repositories/product_repository.py`
- `apps/backend/src/domain/repositories/sale_repository.py`
- `apps/backend/src/infrastructure/database/repositories/product_repository.py`
- `apps/backend/src/infrastructure/database/repositories/sale_repository.py`
- `apps/backend/src/application/use_cases/products/`
- `apps/backend/src/application/use_cases/dashboard/`
- `apps/backend/src/application/use_cases/reports/`
- `apps/backend/src/presentation/api/v1/products.py`
- `apps/backend/src/presentation/api/v1/dashboard.py`
- `apps/backend/src/presentation/api/v1/reports.py`
- `apps/backend/src/presentation/api/v1/router.py`
- `apps/backend/tests/integration/test_products_operations.py`
- `apps/backend/tests/integration/test_dashboard_reports.py`

## Migraciones Necesarias

Probablemente no se requiere nueva tabla.

Revisar indices:

- `products(store_id, name)`
- `products(store_id, category)`
- `products(store_id, sku)`
- `products(store_id, qr_code)`
- `products(store_id, stock)`
- `sales(store_id, created_at)` ya existe.
- `sale_items(product_id)` ya existe via FK, pero considerar indice explicito si reportes son lentos.

Si se agrega migracion:

```text
005_add_operations_indexes.py
```

Debe crear indices solo si faltan.

## Tests Requeridos

### Productos

1. `test_products_search_filters_and_pagination`
   - Crear varios productos.
   - Buscar por nombre.
   - Filtrar por categoria.
   - Verificar `limit`, `offset`, `total`.

2. `test_products_stock_filters`
   - Crear producto disponible, bajo stock y sin stock.
   - Probar `stock=available`, `stock=low`, `stock=out`.

3. `test_product_qr_is_generated_on_create`
   - Crear producto sin QR.
   - Verificar `qr_code` no nulo.

4. `test_product_lookup_by_qr_is_store_scoped`
   - Producto tienda A no visible para tienda B.

5. `test_product_qr_collision_rejected`
   - Crear dos productos con mismo QR debe devolver error.

### Dashboard

6. `test_dashboard_summary_returns_store_metrics`
   - Crear productos y ventas.
   - Verificar ventas del dia, conteos, stock bajo y ultimas ventas.

7. `test_dashboard_summary_does_not_leak_other_store`
   - Datos de otra tienda no aparecen.

### Reportes

8. `test_sales_report_by_range`
   - Crear ventas dentro y fuera del rango.
   - Verificar total, count e items_count.

9. `test_sales_report_groups_by_payment_method`
   - Ventas efectivo/qr.
   - Verificar totales por metodo.

10. `test_sales_report_top_products`
   - Vender distintos productos.
   - Verificar ranking por cantidad.

### Validaciones

11. `test_sales_report_rejects_invalid_range`
   - `from > to` debe devolver 400.

12. `test_sales_report_rejects_range_too_large`
   - Rango mayor a 90 dias debe devolver 400.

## Validaciones Manuales

```powershell
cd apps/backend
python -m pytest tests -q -p no:cacheprovider
python -m ruff check src tests --no-cache
docker compose up -d db
python -m alembic upgrade head
```

Probar en Swagger:

- `/api/v1/products?q=arroz`
- `/api/v1/products/qr/{qr_code}`
- `/api/v1/products/low-stock`
- `/api/v1/dashboard/summary`
- `/api/v1/reports/sales`

## Criterios de Aceptacion

- Productos soportan busqueda, filtros y paginacion.
- Crear producto genera `qr_code` si falta.
- Lookup por QR funciona y respeta tenant.
- Dashboard summary devuelve metricas utiles y store-scoped.
- Reporte de ventas devuelve totales, agrupacion por metodo y top productos.
- No hay nuevas fugas multi-tenant.
- Tests nuevos pasan junto a los existentes.
- OpenAPI muestra contratos claros para web/mobile.

## Riesgos y Decisiones Abiertas

- **Cambio de contrato en `GET /products`:** si web/mobile ya consumen lista simple, podria romper. Recomendado cambiar ahora antes de v1.
- **Timezone de ventas del dia:** usar UTC en Sprint 3. Luego agregar timezone por tienda.
- **QR global vs por tienda:** mantener global por simplicidad. Si se requiere reutilizar codigos por tienda, migrar a unique compuesto.
- **Performance de busqueda:** `ILIKE` es suficiente para 1000 productos. Full-text queda fuera.
- **Reportes grandes:** limitar rango a 90 dias para evitar queries pesadas en planes free.

## Resultado Esperado

Al terminar Sprint 3, web/mobile pueden construir:

1. POS con busqueda rapida y QR.
2. Pantalla de productos con filtros reales.
3. Dashboard inicial del negocio.
4. Reporte basico de ventas.
5. Alertas de stock bajo.

Esto deja listo Sprint 4: importacion asistida por foto/OCR con revision humana.
