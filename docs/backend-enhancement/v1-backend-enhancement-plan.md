# Backend Enhancement Plan for v1

Fecha: 2026-05-19

## Contexto

La app apunta a tiendas pequenas, mayoristas y negocios que necesitan digitalizar inventario sin operar un ERP complejo. La decision de mantener pocas tablas al inicio es correcta: `stores`, `users`, `products`, `sales`, `sale_items` y `exchange_rates` cubren el flujo base. El tenant debe ser `store`; cada dato operativo debe pertenecer a una tienda y ningun endpoint debe exponer datos cruzados.

El backend ya tiene una base razonable: FastAPI, capas separadas, SQLAlchemy async, Alembic, auth con Supabase/dev mode, productos, ventas, tienda, sync inicial, fotos/OCR basico y tests. Para v1, el trabajo critico no es agregar muchas features nuevas, sino cerrar consistencia, aislamiento por tienda y contratos estables para web/mobile.

## Principios para v1

- `store_id` es la frontera de seguridad y datos.
- Productos y ventas deben ser confiables antes de invertir fuerte en OCR, QR o reportes.
- Las ventas son eventos de negocio; deben ser append-only salvo anulacion explicita.
- El stock no debe depender solo de sobrescribir `products.stock` cuando entre offline sync.
- OCR/importacion debe producir borradores revisables, no crear inventario final sin confirmacion humana.
- Mantener el modelo simple, pero dejar extensiones claras para `stock_movements`, `devices` e import jobs.

## Estado Actual Resumido

### Ya alineado

- `products`, `sales`, `sale_items`, `stores`, `users` y `exchange_rates` existen.
- Las tablas principales tienen `store_id` y FKs relevantes.
- `PATCH /products/{id}/stock` ya existe.
- `GET/PATCH /store` ya trabaja contra repositorio real.
- `exchange-rates` tiene upsert.
- `photos/upload` puede subir a Cloudinary si hay credenciales.
- `photos/ocr` intenta EasyOCR y cae a estado `queued`.
- Tests cubren CRUD de productos, ventas, store, exchange rates, fotos y sync basico.

### Riesgos actuales

- Varios repositorios reciben `product_id` o `sale_id` sin `store_id`; el router valida en algunos casos, pero la defensa deberia vivir mas abajo tambien.
- `CreateSaleUseCase` reduce stock y luego guarda la venta; necesita una unidad transaccional explicita y bloqueo/concurrencia razonable.
- Sync acepta cambios de productos muy flexibles (`list[dict]`) y solo soporta producto; falta contrato versionado para mobile.
- No existe `stock_movements`; esto limita auditoria y hace fragil resolver ventas offline desde varios dispositivos.
- No existe modelo persistido de importacion/OCR; los resultados son inmediatos o se pierden.
- CORS esta abierto con `allow_origins=["*"]`.
- Auth depende de `store_id` en metadata de Supabase, pero falta un flujo robusto para crear store + user en la BD propia.

## Prioridad 0: Seguridad Multi-Tenant

Objetivo: ningun acceso a productos, ventas, fotos, sync o reportes debe poder cruzar tiendas.

Acciones:

1. Cambiar metodos de lectura/escritura por ID para aceptar `store_id`: `get_by_id(store_id, product_id)`, `delete(store_id, product_id)`, `update_stock(store_id, product_id, quantity)`, `get_sale(store_id, sale_id)`.
2. Mantener validacion en routers, pero mover la regla principal a repositorios/use cases.
3. Agregar tests de aislamiento con dos tiendas: un producto/venta de tienda A debe devolver 404 para tienda B.
4. Agregar indices compuestos donde aplique: `(store_id, id)`, `(store_id, updated_at)`, `(store_id, deleted_at)`.
5. Revisar `qr_code`: si sera global, mantener unique global; si sera visible por tienda, usar unique compuesto `(store_id, qr_code)`.

Entregable: todos los endpoints operativos pasan por `store_id` y hay tests negativos de tenant isolation.

## Prioridad 1: Ventas y Stock Transaccional

Objetivo: una venta confirmada debe guardar venta, items y descuento de stock de forma atomica.

Acciones:

1. Crear un caso de uso transaccional para venta que no dependa de commits intermedios.
2. En PostgreSQL, usar bloqueo de filas o update condicional para stock: descontar solo si `stock >= quantity`.
3. Registrar `subtotal`, `discount`, `items_count`, `device_id` y `customer_name` desde el DTO cuando aplique.
4. Agregar `stock_movements` como tabla pequena, aunque no se exponga al usuario al inicio.
5. Registrar movimientos para: `initial_stock`, `sale`, `manual_adjustment`, `return`, `import`.

Tabla sugerida:

```sql
stock_movements (
  id uuid primary key,
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  sale_id uuid references sales(id),
  movement_type text not null,
  quantity_delta integer not null,
  stock_after integer not null,
  reason text,
  device_id text,
  created_at timestamptz not null default now()
)
```

Entregable: una venta nunca descuenta stock si no queda guardada, y todo cambio de stock tiene auditoria.

## Prioridad 2: Contrato de Sync Offline

Objetivo: que mobile pueda implementar WatermelonDB sin rehacer el backend despues.

Acciones:

1. Reemplazar `list[dict]` por DTOs tipados para push/pull.
2. Incluir `device_id`, `client_change_id`, `entity`, `operation`, `entity_id`, `payload`, `client_created_at`.
3. Hacer idempotente `sync/push` usando `client_change_id`.
4. Soportar primero `product upsert/delete`, `sale create` y `stock_movement create`.
5. Devolver respuesta por cambio: `accepted`, `rejected`, `conflict`, `server_version`.
6. Mantener ventas append-only; si se corrige una venta, usar anulacion o movimiento inverso.

Regla inicial de conflictos:

- Productos: last-write-wins por campos no criticos como nombre, categoria, precio.
- Stock: delta por `stock_movements`, no sobrescritura directa de `products.stock`.
- Deletes: tombstone con `deleted_at`.

Entregable: contrato documentado y testeado antes de construir sync mobile completo.

## Prioridad 3: Auth, Store Provisioning y Usuarios

Objetivo: registro/login debe crear y relacionar tienda, usuario y metadata sin pasos manuales.

Acciones:

1. En registro, crear `store` en la BD propia ademas de metadata Supabase.
2. Crear/actualizar `users` local al registrarse o al primer login.
3. Validar que el JWT tenga `store_id`; si falta, rechazar o resolverlo desde `users`.
4. Definir roles minimos: `owner`, `cashier`.
5. Preparar permisos simples: solo owner modifica store/config; cashier puede vender y consultar productos.

Entregable: el backend no depende solamente de metadata externa para saber la tienda activa.

## Prioridad 4: Importacion por Foto/OCR

Objetivo: digitalizar inventarios desde hojas/cuadernos sin comprometer la calidad de datos.

Acciones:

1. Crear flujo de importacion como borrador: `inventory_imports` e `inventory_import_items`.
2. `photos/ocr` debe crear un job/import con estado `pending`, `processing`, `needs_review`, `confirmed`, `failed`.
3. Procesar OCR en Celery cuando haya Redis; en local/dev puede seguir con fallback inmediato.
4. Guardar `raw_text`, `structured_items`, confianza y errores por fila.
5. Crear endpoint para confirmar items revisados: la confirmacion crea productos y movimientos `initial_stock` o `import`.

Modelo minimo:

```text
inventory_imports: id, store_id, status, source_photo_url, raw_text, created_at
inventory_import_items: id, import_id, name, price, stock, category, confidence, status
```

Entregable: OCR ayuda a cargar productos, pero el usuario siempre confirma antes de afectar inventario.

## Prioridad 5: QR y Busqueda Operativa

Objetivo: que la operacion diaria sea rapida aun con 1000 productos.

Acciones:

1. Generar `qr_code` al crear producto si no viene uno.
2. Agregar `GET /products/qr/{qr_code}` filtrado por `store_id`.
3. Agregar busqueda paginada por nombre, SKU/codigo y categoria.
4. Preparar respuesta compacta para POS: id, name, price, stock, unit, qr_code.
5. Definir formato QR simple: UUID o token corto; evitar meter datos sensibles en el QR.

Entregable: venta por busqueda/QR puede funcionar rapido y offline con datos sincronizados.

## Prioridad 6: Dashboard y Reportes Minimos

Objetivo: dar valor inmediato al dueno sin crear un sistema contable.

Endpoints sugeridos:

- `GET /dashboard/summary`: ventas hoy, monto hoy, productos bajos, ultimas ventas.
- `GET /reports/sales?from=&to=`: ventas por rango.
- `GET /products/low-stock`: productos con `stock <= min_stock`.

Entregable: web/mobile pueden mostrar metricas utiles sin queries duplicadas en clientes.

## Prioridad 7: Operacion y Calidad

Acciones:

1. Crear `apps/backend/.env.example`.
2. Restringir CORS por ambiente.
3. Documentar comandos oficiales de dev/test/migrate.
4. Mantener `daily-keepalive` manual hasta que el script sea idempotente.
5. Agregar tests de concurrencia basicos para stock.
6. Agregar tests de sync idempotente y tenant isolation.
7. Mantener OpenAPI como fuente para clientes web/mobile.

## Plan de Ejecucion Propuesto

### Sprint 1: Fundacion multi-tenant y transacciones

- Repositorios por `store_id`.
- Tests de aislamiento de tenant.
- Venta atomica con descuento seguro.
- `stock_movements` y migracion.
- `.env.example` y CORS por ambiente.

### Sprint 2: Sync MVP estable

- DTOs tipados para sync.
- Idempotencia con `client_change_id`.
- Soporte de `product`, `sale` y `stock_movement`.
- Pull incremental por `updated_at/server_time`.
- Documentacion del contrato sync para mobile.

### Sprint 3: Operacion diaria

- QR generado por producto.
- Lookup por QR.
- Busqueda/paginacion de productos.
- Dashboard summary.
- Reporte basico de ventas.

### Sprint 4: Importacion asistida

- `inventory_imports` e `inventory_import_items`.
- OCR asincrono con job persistido.
- Revision/confirmacion de items.
- Creacion masiva de productos desde import confirmado.

## Criterios de Listo para v1 Backend

- No hay endpoints que lean/escriban recursos fuera del `store_id`.
- Crear venta y descontar stock es atomico.
- Cada cambio de stock queda auditado.
- Sync tiene contrato estable, idempotente y testeado.
- Productos soportan busqueda, QR y paginacion.
- OCR crea borradores revisables, no datos finales automaticos.
- Tests backend cubren happy paths, errores criticos y aislamiento tenant.
- Web/mobile pueden generar cliente desde OpenAPI sin contratos ambiguos.

## Decision Recomendada

Avanzar primero con multi-tenant, ventas/stock y sync. OCR, QR y dashboard son importantes para el valor comercial, pero dependen de una base confiable. Para una app con tiendas pequenas y mayoristas de hasta 1000 tipos de productos, esta ruta mantiene el backend simple sin cerrar puertas a offline-first, importacion por foto y crecimiento posterior.
