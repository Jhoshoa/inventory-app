# Sprint 1 Foundation Plan

Fecha: 2026-05-19

## Objetivo

Cerrar la base tecnica de v1 para que el backend sea seguro por tenant y confiable al registrar ventas. El tenant es `store`; toda operacion de productos, ventas, stock, sync inicial y reportes futuros debe quedar filtrada por `store_id`.

## Alcance Incluido

- Reforzar tenant isolation en repositorios, use cases y endpoints.
- Hacer que las operaciones por ID reciban `store_id`, no solo `product_id` o `sale_id`.
- Registrar auditoria de stock con una tabla `stock_movements`.
- Ajustar el flujo de venta para guardar venta, items, descuento de stock y movimientos dentro de la misma unidad de trabajo.
- Agregar tests de aislamiento multi-tenant y stock.
- Agregar configuracion operativa minima: `.env.example` y CORS configurable.

## Fuera de Alcance

- Sync offline completo e idempotente.
- OCR/importacion persistida.
- Dashboard/reportes.
- Roles avanzados y permisos por pantalla.
- RLS en Supabase. En v1 inicial, la autorizacion vive en la API.

## Archivos Principales a Tocar

- `apps/backend/src/domain/repositories/product_repository.py`
- `apps/backend/src/domain/repositories/sale_repository.py`
- `apps/backend/src/infrastructure/database/repositories/product_repository.py`
- `apps/backend/src/infrastructure/database/repositories/sale_repository.py`
- `apps/backend/src/infrastructure/database/models/`
- `apps/backend/src/infrastructure/database/alembic/versions/`
- `apps/backend/src/application/use_cases/products/`
- `apps/backend/src/application/use_cases/sales/create_sale.py`
- `apps/backend/src/presentation/api/v1/products.py`
- `apps/backend/src/presentation/api/v1/sales.py`
- `apps/backend/src/config/settings.py`
- `apps/backend/src/main.py`
- `apps/backend/tests/`

## Migracion Necesaria

Crear `stock_movements`:

```sql
stock_movements (
  id uuid primary key,
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  sale_id uuid references sales(id),
  movement_type varchar(40) not null,
  quantity_delta integer not null,
  stock_after integer not null,
  reason varchar(120),
  device_id varchar(100),
  created_at timestamptz not null default now()
)
```

Indices:

- `ix_stock_movements_store_id_created_at`
- `ix_stock_movements_product_id`
- `ix_products_store_id_id`
- `ix_sales_store_id_id`

## Criterios de Aceptacion

- Un usuario de tienda A no puede leer, editar, vender, ajustar stock ni borrar productos de tienda B.
- Un usuario de tienda A no puede leer ventas de tienda B.
- Una venta descuenta stock y crea movimientos de stock por cada item.
- Un ajuste manual de stock crea movimiento `manual_adjustment`.
- Si una venta falla por stock insuficiente, no se crea venta ni movimiento parcial.
- CORS puede configurarse por ambiente sin dejar `*` fijo en produccion.
- Tests backend pasan con `pytest`.

## Orden de Implementacion

1. Actualizar interfaces de repositorios para incluir `store_id`.
2. Actualizar repositorios SQLAlchemy y use cases.
3. Ajustar routers para pasar `store_id` directamente.
4. Agregar modelo y migracion de `stock_movements`.
5. Registrar movimientos en ajuste manual y venta.
6. Agregar `.env.example` y CORS configurable.
7. Agregar tests de tenant isolation, venta y movimientos.
8. Ejecutar `pytest` y `ruff`.

## Riesgos y Decisiones

- SQLite en tests no valida igual que PostgreSQL para bloqueos de fila; los tests deben cubrir comportamiento funcional y la implementacion debe usar patrones compatibles.
- La transaccion real se maneja en la dependency `get_db_session`; los repositorios deben usar `flush`, no `commit`.
- `stock_movements` se introduce ahora aunque no haya endpoint publico, porque es base para sync offline y auditoria.
