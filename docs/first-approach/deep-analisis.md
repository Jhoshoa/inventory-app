# Deep Analisis - Inventory App

Fecha: 2026-05-12

## Veredicto corto

La direccion general si hace sentido: monorepo con `apps/backend`, `apps/web`, `apps/mobile`, backend en FastAPI con Clean Architecture, Supabase PostgreSQL/Auth, Redis + Celery para trabajos asincronos, Cloudinary para fotos, Expo para mobile y Next.js para web.

El proyecto actual, sin embargo, esta en una etapa de scaffold avanzado, no en una etapa backend-ready. La estructura coincide bastante bien con `folder-structure.md` y `backend-implementation-plan.md`, pero hay diferencias importantes entre lo planeado y lo implementado en endpoints, repositorios, tablas, auth, sync, fotos y frontends.

## Estructura y arquitectura

La estructura actual es coherente con el plan:

- `apps/backend`: FastAPI + capas `domain`, `application`, `infrastructure`, `presentation`.
- `apps/web`: Next.js App Router.
- `apps/mobile`: Expo Router.
- `docs`: brainstorming y first approach.
- `scripts`: keepalive.

La decision de mover el backend desde "Next.js API Routes o Express" hacia FastAPI es correcta para este producto. El backend necesita OCR, procesamiento de imagenes, jobs asincronos, validaciones fuertes, OpenAPI y casos de uso claros. Python + FastAPI + Celery encaja mejor que Node/BullMQ para esa mezcla.

La Clean Architecture tambien hace sentido para un producto offline-first porque ayuda a separar:

- Reglas de negocio: productos, ventas, stock, tienda.
- Casos de uso: crear producto, vender, sincronizar.
- Infraestructura: SQLAlchemy, Supabase, Cloudinary, Celery.
- API: routers FastAPI.

El riesgo es que para un MVP pequeno puede volverse pesada si cada feature se implementa con muchas clases pero sin comportamiento real. Conviene mantener la arquitectura, pero priorizar flujos verticales completos antes de seguir agregando carpetas.

## Stack

### Backend

El stack actual en `apps/backend/pyproject.toml` es razonable:

- FastAPI.
- SQLAlchemy async + asyncpg.
- Alembic.
- Pydantic v2.
- Supabase.
- Cloudinary.
- Celery + Redis.
- pytest, ruff, mypy.
- Extras opcionales para OCR/AI.

La separacion de dependencias AI como extra opcional es buena, porque EasyOCR/OpenCV/spaCy pueden hacer pesado el setup local y el deploy.

Puntos a corregir:

- Falta `.env.example` en `apps/backend`, aunque el README lo menciona.
- `Settings` exige todas las variables al importar la app. Eso rompe tests simples si no hay `.env`.
- No hay configuracion clara de CORS por ambiente.
- `JWT_SECRET` esta definido, pero la verificacion real usa Supabase.

### Web

El stack Next.js + Tailwind esta bien para dashboard administrativo. El proyecto existe, pero todavia no implementa la estructura feature-first planeada. El proxy `app/api/[...path]/route.ts` solo responde `{ message: "API proxy" }`, no proxya al backend.

### Mobile

Expo + WatermelonDB + NativeWind hace sentido para offline-first. La app existe, pero todavia no hay modelo local/sync real visible en el scaffold actual.

## Backend actual vs plan

### Lo que si esta alineado

- `src/main.py` crea FastAPI, registra CORS, error handlers y router `/api/v1`.
- `presentation/api/v1` tiene routers para products, sales, photos, sync, auth, store y exchange-rates.
- `domain/entities` contiene Product, Sale, Store, User, ExchangeRate.
- `application/use_cases` contiene casos para products, sales, photos, sync, auth y store.
- `infrastructure/database/models` tiene modelos SQLAlchemy para products, sales, stores, users y exchange_rates.
- Hay migracion inicial en Alembic.
- Hay repositorios SQLAlchemy para products, sales y sync.
- Hay tareas Celery y servicio Cloudinary scaffolded.

### Lo que todavia no esta listo

El backend tiene endpoints y clases, pero varios no son funcionales o tienen problemas de consistencia:

- Auth real no esta implementado: `/auth/login`, `/auth/register`, `/auth/refresh` levantan `NotImplementedError`.
- Store esta como placeholder: `GET /store` solo devuelve `store_id`; `PATCH /store` devuelve `ok`.
- Exchange rates esta como placeholder: devuelve `[]`.
- Photos no sube a Cloudinary ni encola OCR real desde el endpoint; solo lee bytes y devuelve size/status.
- Sync solo soporta cambios de product y con SQL manual minimo.
- No hay endpoints para dashboard/reportes.
- No hay endpoint dedicado de ajuste de stock, aunque el use case existe.
- No hay endpoint para QR generation o lectura/lookup por QR.

## Endpoints

Endpoints actuales:

- `GET /api/v1/products`
- `POST /api/v1/products`
- `GET /api/v1/products/{product_id}`
- `PATCH /api/v1/products/{product_id}`
- `DELETE /api/v1/products/{product_id}`
- `GET /api/v1/sales`
- `POST /api/v1/sales`
- `GET /api/v1/sales/{sale_id}`
- `POST /api/v1/sync/push`
- `POST /api/v1/sync/pull`
- `POST /api/v1/photos/upload`
- `POST /api/v1/photos/ocr`
- `GET /api/v1/store`
- `PATCH /api/v1/store`
- `GET /api/v1/exchange-rates`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/dev-login` solo en DEBUG.

Para el MVP, el set de endpoints es una buena base, pero no cubre completamente el producto planeado.

Endpoints que faltan o deben completarse:

- `PATCH /products/{id}/stock` para ajustes manuales.
- `GET /products/qr/{qr_code}` o busqueda por QR.
- `POST /products/{id}/qr` si el QR se genera despues.
- `GET /dashboard/summary` para ventas del dia, stock bajo, ultimas ventas y tipo de cambio.
- `GET /reports/sales` para web.
- `POST /photos/upload` integrado a Cloudinary.
- `POST /photos/ocr` integrado con Celery y resultado consultable.
- `GET /sync/status` o metadata de pending/server time si se quiere mostrar estado.

## Entidades y reglas de negocio

### Product

La entidad `Product` es suficiente para empezar: id, store_id, name, price, stock, min_stock, category, sku, unit, photo_url, qr_code, cost_price, active, version.

Problemas:

- No valida price negativo en la entidad; la validacion vive en DTO.
- No valida stock negativo al crear.
- No contiene `created_at`, `updated_at`, `deleted_at`, aunque el DB model si.
- No hay metodo explicito para ajustar stock con razon/tipo de ajuste.
- `qr_code` existe, pero no se genera.

### Sale

La entidad `Sale` y `SaleItem` tiene el minimo correcto: items, total, payment method, status.

Problemas:

- No guarda `device_id`, `customer_name`, `subtotal`, `discount`, `items_count`, `synced`, `version`, `deleted_at`, aunque el first approach los proponia.
- No hay regla para venta vacia.
- No hay soporte para devoluciones.
- No hay control transaccional fuerte entre venta y descuento de stock.

## DB, tablas y migraciones

La migracion inicial crea:

- `stores`
- `products`
- `sales`
- `sale_items`
- `users`
- `exchange_rates`

Esto coincide parcialmente con el documento inicial, pero faltan detalles importantes para offline-first y consistencia:

- `products.store_id` no tiene foreign key hacia `stores`.
- `sales.store_id` no tiene foreign key hacia `stores`.
- `sale_items.product_id` no tiene foreign key hacia `products`.
- `users.store_id` no tiene foreign key hacia `stores`.
- `sales` no tiene `device_id`, `customer_name`, `subtotal`, `discount`, `items_count`, `synced`, `version`, `deleted_at`.
- `sale_items` no tiene `ON DELETE CASCADE` en la migracion, aunque el plan lo mencionaba.
- `exchange_rates` usa PK compuesta `(date, source)` en vez de `id UUID + UNIQUE(date, source)`. Esto esta bien, pero debe documentarse como decision.
- `products.extra_data` reemplaza `metadata`. Esto evita conflicto con nombres reservados de SQLAlchemy y es una buena decision, pero el plan debe actualizarse para usar `extra_data`.
- No hay tabla `sync_queue`, `sync_log`, `stock_movements`, `photo_jobs` ni `devices`.

Para un offline-first real, falta una tabla de auditoria o movimientos. Con solo `products.stock` y `sales`, resolver conflictos de stock entre dispositivos sera fragil.

## Repositorios

Este es el punto mas critico del backend actual.

`ProductRepository.save(product)` siempre crea un nuevo `ProductModel` y hace `session.add(model)`. Eso sirve para crear, pero no para actualizar. Actualmente se usa tambien desde:

- `UpdateProductUseCase`
- `CreateSaleUseCase` despues de `product.reduce_stock()`

Resultado esperado en DB real:

- `PATCH /products/{id}` puede intentar insertar un producto con un id existente.
- `POST /sales` puede intentar insertar un producto duplicado al reducir stock.
- Si no falla por PK, el comportamiento no representa una actualizacion real.

La solucion es separar responsabilidades:

- `create(product)`
- `update(product)`
- `save(product)` con upsert real/merge controlado
- `decrease_stock(product_id, quantity)` transaccional

Tambien falta asegurar que una venta y su descuento de stock corran en una sola transaccion. Actualmente cada reduccion de stock hace commit antes de guardar la venta. Si falla la venta, el stock ya pudo cambiar.

## Sync offline

La idea de `/sync/push` y `/sync/pull` hace sentido, pero la implementacion actual es muy basica:

- Solo procesa `product upsert` y `product delete`.
- No procesa ventas.
- No registra origen por device.
- No devuelve conflictos.
- No usa versionado suficientemente robusto.
- No incluye tombstones claros para deletes.
- `pull` devuelve metadata minima, no payload completo.

Para el MVP piloto, conviene definir un protocolo simple pero explicito:

- Cada cambio local tiene `client_id`, `device_id`, `entity`, `entity_id`, `operation`, `payload`, `client_created_at`.
- El server responde accepted/rejected/conflict.
- El server asigna `server_version` y `server_updated_at`.
- Las ventas deben ser append-only.
- El stock debe resolverse por movimientos, no solo por ultimo valor absoluto.

## Auth y multi-tenant

La decision Supabase Auth es correcta, pero debe cerrarse bien:

- El backend verifica token con Supabase.
- Cada request usa `store_id` del usuario.
- Los repositorios deben filtrar por `store_id`.
- Los endpoints `get_product`, `update_product`, `delete_product`, `get_sale` deben verificar pertenencia a la tienda, no solo por id.
- En DB deben existir FKs e indices por `store_id`.
- Si se usara Supabase RLS directamente, hay que decidir si el backend usa service role o anon/user token. Hoy parece backend con service role para auth verification, asi que la autorizacion recae en la API.

## Frontend y API proxy

El plan dice que la web tendra proxy Next.js hacia backend Python. El archivo existe, pero no implementa proxy real. Hoy las rutas GET/POST/PATCH/DELETE solo devuelven un mensaje fijo.

Para alinear el stack:

- Definir `BACKEND_URL`.
- Reenviar path, method, headers relevantes y body.
- Preservar Authorization.
- Manejar errores y status codes del backend.

La generacion de tipos OpenAPI tampoco esta implementada todavia en web/mobile.

## Conclusiones

La arquitectura, carpeta y stack hacen sentido para el objetivo del producto, pero el backend actual no debe considerarse listo para que mobile/web construyan encima sin ajustes. La estructura esta bien; los flujos transaccionales y los contratos deben madurar.

Prioridad recomendada:

1. Corregir repositorios y transacciones de productos/ventas.
2. Completar auth real o definir modo dev estable.
3. Ajustar migracion/schema para FKs, indices y columnas offline-first.
4. Completar endpoints MVP reales: products, sales, stock, store, exchange-rates.
5. Definir sync protocol minimo antes de construir mobile offline.
6. Implementar proxy web real y generacion OpenAPI -> TypeScript.
7. Dejar OCR/fotos asincronas como fase posterior si el core POS todavia no esta estable.

## Recomendacion final

Si. El plan hace sentido, pero debe actualizarse con una regla practica: primero cerrar un flujo vertical completo y transaccional.

Flujo vertical recomendado:

1. Login dev/auth.
2. Crear tienda.
3. Crear producto.
4. Listar producto.
5. Crear venta.
6. Descontar stock en la misma transaccion.
7. Ver venta.
8. Pull sync simple.

Despues de eso, agregar fotos/OCR, QR, dashboard, reportes y sync conflict resolution.
