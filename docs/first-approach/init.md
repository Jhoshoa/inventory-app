# Init - Inventory App

Fecha: 2026-05-12

Este archivo resume el punto de arranque recomendado despues del analisis profundo del proyecto.

## Decision base

Mantener:

- Monorepo `apps/backend`, `apps/web`, `apps/mobile`.
- Backend Python + FastAPI.
- Clean Architecture en backend.
- Supabase PostgreSQL/Auth.
- Celery + Redis para jobs.
- Cloudinary para fotos.
- Expo + WatermelonDB para mobile offline-first.
- Next.js para web admin.
- OpenAPI como fuente de tipos para web/mobile.

Cambiar o reforzar:

- No tratar el backend actual como completo; es un scaffold con algunos flujos parciales.
- Priorizar flujos verticales funcionales antes de agregar mas estructura.
- Corregir repositorios, transacciones y schema antes de construir la sync mobile encima.

## Orden de inicializacion recomendado

### 1. Backend core

- Crear `.env.example` para `apps/backend`.
- Permitir tests sin credenciales reales o documentar variables dummy.
- Corregir `ProductRepository.save` para que no inserte duplicados en updates.
- Separar create/update o implementar upsert controlado.
- Hacer `CreateSaleUseCase` transaccional: venta + items + descuento de stock en una sola unidad.
- Agregar validaciones de dominio para venta vacia, stock negativo y precio invalido.

### 2. Base de datos

- Agregar FKs:
  - `products.store_id -> stores.id`
  - `sales.store_id -> stores.id`
  - `sale_items.sale_id -> sales.id ON DELETE CASCADE`
  - `sale_items.product_id -> products.id`
  - `users.store_id -> stores.id`
- Agregar indices por `store_id`, `updated_at`, `deleted_at`.
- Decidir y documentar `extra_data` en lugar de `metadata`.
- Agregar columnas offline-first faltantes donde aplique: `device_id`, `synced`, `version`, `deleted_at`.
- Considerar `stock_movements` para resolver conflictos de stock.

### 3. Endpoints MVP

- Completar auth o modo dev estable.
- Completar store real.
- Completar products CRUD.
- Agregar ajuste de stock.
- Completar sales create/list/get.
- Completar exchange-rates read.
- Agregar dashboard summary.

### 4. Sync MVP

- Definir contrato exacto de `push` y `pull`.
- Soportar productos y ventas.
- Usar `device_id`, `client_id`, `server_version`, `server_updated_at`.
- Hacer ventas append-only.
- Resolver stock por movimientos o reglas explicitas.

### 5. Web y mobile

- Implementar proxy Next.js real hacia FastAPI.
- Generar cliente/tipos desde OpenAPI.
- En mobile, implementar primero almacenamiento local de productos/ventas.
- Conectar sync despues de que el contrato backend este estable.

### 6. Fotos, OCR y QR

- QR puede entrar despues del CRUD de productos.
- Cloudinary upload debe guardar URL en producto.
- OCR debe ser asincrono con Celery y estado consultable.
- No bloquear el MVP POS por OCR.

## Primer flujo que debe funcionar end-to-end

1. Crear o simular usuario con `store_id`.
2. Crear producto.
3. Listar producto.
4. Crear venta con ese producto.
5. Descontar stock.
6. Consultar venta.
7. Consultar producto y ver stock actualizado.

Este flujo debe tener tests unitarios y al menos un test de integracion antes de avanzar a mobile sync.
