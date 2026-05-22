# Sprint 1 Owner/Cashier Permissions Plan

Fecha: 2026-05-21

## Objetivo

Cerrar el primer corte real de roles `owner` y `cashier` de punta a punta. Al final del sprint debe ser posible iniciar sesion como cajero demo, operar POS y consultar informacion permitida, sin ver ni ejecutar acciones administrativas.

Este sprint no busca implementar invitaciones por correo ni RBAC. La prioridad es que el modelo simple actual deje de ser parcial y se convierta en una politica consistente en backend, web y tests.

## Skills Aplicados

- `fastapi-templates`: aplicar autorizacion con dependencias explicitas, rutas async limpias, use cases existentes y tests de integracion por endpoint.
- `next-best-practices`: mantener paginas como Server Components cuando sea posible, usar guards del lado servidor, route handlers para acciones protegidas y session cookies httpOnly.
- `vercel-react-best-practices`: evitar waterfalls con `Promise.all`, pasar solo datos necesarios a Client Components y mantener componentes de permisos chicos y puros.

## Estado Actual Verificado

### Ya existe

- Tabla `users` con `role`, `store_id`, `is_active`, `last_login_at`.
- Roles reconocidos: `owner` y `cashier`.
- `UserRepository` y use cases de usuarios.
- `get_current_user_context`, `require_active_user` y `require_owner`.
- `GET /auth/me` devuelve rol local.
- Protecciones backend ya aplicadas a:
  - exports CSV.
  - anulacion de ventas.
  - confirmacion de importaciones.
  - update de tienda.
  - listar/cambiar usuarios.
  - eliminar productos.
- Tests backend para:
  - cashier no puede actualizar tienda.
  - cashier no puede confirmar import.
  - cashier no puede eliminar producto.
  - cashier no puede anular venta.
  - cashier no puede exportar CSV.
  - proteccion del ultimo owner activo.
- Web guarda `session.role`.
- Web tiene helpers `isOwner`, `canExport`, `canVoidSale`, `canManageSettings`, `canConfirmImport`.
- Web ya bloquea exportes e import confirm para cashier.
- Settings muestra rol y matriz informativa.

### Falta

- Seed demo con usuario `cashier` persistente.
- Login/dev-login que permita probar cashier sin editar la BD a mano.
- Matriz unica de permisos codificada para frontend.
- Backend autoritativo para crear/editar productos y ajustar stock.
- Backend usando contexto local activo en mas endpoints operativos.
- UI filtrada por rol:
  - sidebar.
  - botones de producto.
  - paginas de crear/editar producto.
  - boton de anular venta.
  - acciones de import review/cancel.
  - settings si se decide que cashier no debe entrar.
- Tests frontend para UI de cashier en productos, ventas, sidebar y settings.
- Tests backend faltantes para producto/stock como cashier.

## Decision de Producto Para Sprint 1

Mantener dos roles:

- `owner`: administra tienda, usuarios, inventario, importaciones, anulaciones y exportes.
- `cashier`: opera POS y consulta informacion necesaria para vender.

### Permisos Sprint 1

| Accion | owner | cashier | Decision |
|---|---:|---:|---|
| Ver dashboard | si | si | Permitido por ahora. Revisar si expone metricas sensibles en futuro. |
| Ver POS | si | si | Cajero necesita vender. |
| Crear venta | si | si | Core del rol cashier. |
| Ver ventas | si | si | Permitido para soporte operativo. |
| Anular venta | si | no | Accion sensible por stock/caja. |
| Ver productos | si | si | Cajero necesita consultar precios y stock. |
| Crear producto | si | no | Administrativo. |
| Editar producto | si | no | Administrativo. |
| Eliminar producto | si | no | Ya protegido en backend. |
| Ajustar stock | si | no | Administrativo, impacta inventario sin venta. |
| Ver movimientos de stock | si | si | Lectura operativa y auditoria basica. |
| Ver reportes | si | si | Permitido por ahora. |
| Exportar CSV | si | no | Ya protegido en backend. |
| Subir imagen de importacion | si | no | Para Sprint 1 queda owner-only para reducir superficie. |
| Revisar/editar items de importacion | si | no | Impacta catalogo futuro. |
| Confirmar importacion | si | no | Ya protegido en backend. |
| Cancelar importacion | si | no | Administrativo en este corte. |
| Ver tienda/settings | si | no | Cashier no necesita pantalla administrativa. |
| Gestionar usuarios | si | no | Ya protegido en backend. |
| Sync | si | si | Mantener operativo para mobile/offline. |
| Exchange rates | si | si | Mantener si POS depende de lectura. Revaluar escritura si aplica. |
| Fotos | si | si | Mantener si se usa como soporte operativo; no bloquear en Sprint 1 salvo abuso. |

## Alcance Incluido

### Backend

1. Agregar usuario cashier demo al seed.
2. Agregar soporte de dev-login como cashier.
3. Usar contexto local activo para endpoints que hoy dependen solo del token bruto cuando el endpoint necesita rol o usuario activo.
4. Proteger con `require_owner`:
   - `POST /products`
   - `PATCH /products/{product_id}`
   - `PATCH /products/{product_id}/stock`
   - `POST /inventory-imports/from-photo`
   - `PATCH /inventory-imports/{import_id}/items/{item_id}`
   - `POST /inventory-imports/{import_id}/cancel`
5. Mantener accesible para cashier:
   - `GET /products`
   - `GET /products/pos`
   - `GET /products/{id}`
   - `GET /products/qr/{qr_code}`
   - `GET /products/{id}/stock-movements`
   - `POST /sales`
   - `GET /sales`
   - `GET /sales/{id}`
   - `GET /reports/sales`
   - `GET /stock-movements`
   - `GET /dashboard`
   - `sync` basico.
6. Agregar tests de permisos faltantes.

### Web

1. Ampliar `src/lib/auth/permissions.ts` con acciones del Sprint 1:
   - `canViewSettings`
   - `canManageProducts`
   - `canAdjustStock`
   - `canDeleteProduct`
   - `canCreateImport`
   - `canReviewImport`
   - `canCancelImport`
   - `canAccessRoute`
2. Pasar `session` o `session.role` al `AppSidebar`.
3. Filtrar navegacion para cashier:
   - mostrar Dashboard, POS, Productos, Ventas, Reportes.
   - ocultar Import Image y Ajustes.
4. Proteger paginas owner-only:
   - `/dashboard/products/new`
   - `/dashboard/products/[productId]/edit`
   - `/dashboard/imports`
   - `/dashboard/imports/[importId]`
   - `/dashboard/settings`
5. Ocultar acciones no permitidas:
   - editar producto.
   - ajustar stock.
   - eliminar producto.
   - anular venta.
   - cargar import image.
   - editar/revisar/cancelar importacion.
6. Mantener defensa por errores 403 en server actions y route handlers, porque backend sigue siendo autoridad.
7. Ajustar textos de settings para que la gestion de usuarios quede marcada como siguiente sprint, no como parte de este.

### Tests

1. Backend integration tests para cada endpoint sensible nuevo.
2. Frontend unit tests para helpers de permisos.
3. Component tests para sidebar y acciones visibles por rol.
4. Page-level tests donde sea viable para guards owner-only.

## Fuera de Alcance

- Invitaciones por correo.
- Pantalla real de gestion de usuarios.
- Reenvio/revocacion de invitaciones.
- Auditoria con `created_by` en ventas y stock.
- Roles personalizados.
- RBAC con tablas `roles`, `permissions`, `role_permissions`.
- Multi-store por usuario.
- Password local completo con `AUTH_PROVIDER=local`.

## Arquitectura Recomendada

### Backend

El backend debe ser la fuente autoritativa. La UI mejora la experiencia, pero no debe ser la unica barrera.

Patron:

```python
async def create_product(
    dto: CreateProductDTO,
    user=Depends(require_owner),
    repo: ProductRepository = Depends(get_product_repo),
):
    ...
```

Cuando el endpoint solo requiere usuario activo:

```python
async def list_product_stock_movements(
    user=Depends(require_active_user),
):
    ...
```

Evitar mezclar `get_current_user` y `require_owner` si se puede obtener `store_id` desde el contexto local. Esto reduce inconsistencias entre JWT y tabla local.

Regla:

- Accion administrativa: `require_owner`.
- Accion operativa de lectura/venta: `require_active_user`.
- Solo dejar `get_current_user` en endpoints donde aun no se pueda migrar sin tocar mucho contrato, pero marcarlo como deuda.

### Web

Mantener permisos como helpers puros y testeables:

```ts
export function canManageProducts(role: UserRole | undefined): boolean {
  return isOwner(role);
}
```

Las paginas protegidas deben resolver session en servidor:

```ts
const session = await requireSession();
if (!canManageProducts(session.role)) return <ForbiddenState ... />;
```

Para acciones dentro de tablas o detalles, pasar `role` al componente que renderiza botones. No leer cookies en Client Components.

Para cargas paralelas, seguir el patron actual:

```ts
const [session, product] = await Promise.all([
  requireSession(),
  getProduct(productId),
]);
```

## Implementacion Por Pasos

### 1. Seed y dev-login

Archivos probables:

- `apps/backend/src/infrastructure/database/seed/dev_seed.py`
- `apps/backend/src/presentation/dependencies.py`
- `apps/backend/src/presentation/api/v1/auth.py`
- `apps/backend/tests/integration/test_seed.py`
- `apps/backend/tests/unit/presentation/test_dependencies.py`
- `apps/backend/tests/integration/test_auth_users_permissions.py`

Tareas:

- Definir `DEV_CASHIER_USER_ID`.
- Seedear `cashier@local.dev` en la tienda demo con rol `cashier`.
- Permitir dev-login cashier solo en `DEBUG`.
- Asegurar que `/auth/me` como cashier devuelve `role = cashier`.
- Documentar credenciales demo en README si aplica.

Decision recomendada:

- `POST /api/v1/auth/dev-login?role=cashier` para herramientas/manual.
- En `/auth/login`, si `DEBUG` y email es `cashier@local.dev`, devolver cashier.

Esto permite probar tanto desde Swagger como desde la web existente.

### 2. Backend permissions hardening

Archivos probables:

- `apps/backend/src/presentation/api/v1/products.py`
- `apps/backend/src/presentation/api/v1/inventory_imports.py`
- `apps/backend/src/presentation/api/v1/dashboard.py`
- `apps/backend/src/presentation/api/v1/reports.py`
- `apps/backend/src/presentation/api/v1/sales.py`

Tareas:

- Migrar endpoints administrativos a `require_owner`.
- Migrar endpoints operativos a `require_active_user` cuando no rompa tests existentes.
- Mantener `store_id` desde `user.store_id`.
- Agregar tests negativos para cashier.
- Agregar tests positivos para cashier en venta/lectura.

Endpoints owner-only para Sprint 1:

```text
POST   /api/v1/products
PATCH  /api/v1/products/{product_id}
PATCH  /api/v1/products/{product_id}/stock
DELETE /api/v1/products/{product_id}
POST   /api/v1/inventory-imports/from-photo
PATCH  /api/v1/inventory-imports/{import_id}/items/{item_id}
POST   /api/v1/inventory-imports/{import_id}/confirm
POST   /api/v1/inventory-imports/{import_id}/cancel
PATCH  /api/v1/store
GET    /api/v1/users
PATCH  /api/v1/users/{user_id}/role
PATCH  /api/v1/users/{user_id}/status
GET    /api/v1/exports/*.csv
POST   /api/v1/sales/{sale_id}/void
```

Endpoints cashier-friendly:

```text
GET  /api/v1/products
GET  /api/v1/products/pos
GET  /api/v1/products/low-stock
GET  /api/v1/products/qr/{qr_code}
GET  /api/v1/products/{product_id}
GET  /api/v1/products/{product_id}/stock-movements
POST /api/v1/sales
GET  /api/v1/sales
GET  /api/v1/sales/{sale_id}
GET  /api/v1/reports/sales
GET  /api/v1/stock-movements
GET  /api/v1/store
GET  /api/v1/auth/me
POST /api/v1/sync/push
GET  /api/v1/sync/pull
```

### 3. Frontend permission helpers

Archivos probables:

- `apps/web/src/lib/auth/permissions.ts`
- `apps/web/src/lib/auth/permissions.test.ts`

Tareas:

- Centralizar matriz Sprint 1.
- Agregar tests para owner/cashier/undefined.
- Mantener helpers sin dependencias de React.

Propuesta:

```ts
export function canManageProducts(role: UserRole | undefined): boolean;
export function canAdjustStock(role: UserRole | undefined): boolean;
export function canCreateImport(role: UserRole | undefined): boolean;
export function canReviewImport(role: UserRole | undefined): boolean;
export function canCancelImport(role: UserRole | undefined): boolean;
export function canViewSettings(role: UserRole | undefined): boolean;
```

### 4. Sidebar y rutas

Archivos probables:

- `apps/web/src/components/layout/AppShell.tsx`
- `apps/web/src/components/layout/AppSidebar.tsx`
- `apps/web/src/components/layout/AppShell.test.tsx`
- `apps/web/app/(app)/dashboard/products/new/page.tsx`
- `apps/web/app/(app)/dashboard/products/[productId]/edit/page.tsx`
- `apps/web/app/(app)/dashboard/imports/page.tsx`
- `apps/web/app/(app)/dashboard/imports/[importId]/page.tsx`
- `apps/web/app/(app)/dashboard/settings/page.tsx`

Tareas:

- `AppShell` pasa session al sidebar.
- Sidebar filtra items por permisos.
- Owner-only pages retornan `ForbiddenState` o redirigen a dashboard.
- Preferir `ForbiddenState` para explicar permiso en una pagina directa.

Decision UX:

- En navegacion, ocultar lo que cashier no usa.
- En URL directa, mostrar `ForbiddenState` con mensaje corto.

### 5. Acciones visibles en productos y ventas

Archivos probables:

- `apps/web/src/features/products/components/ProductTable.tsx`
- `apps/web/src/features/products/components/ProductDetail.tsx`
- `apps/web/src/features/products/components/ProductStockDialog.tsx`
- `apps/web/src/features/products/components/ProductDeleteDialog.tsx`
- `apps/web/src/features/sales/components/SaleDetail.tsx`
- `apps/web/src/features/sales/components/VoidSaleDialog.tsx`
- paginas que llaman esos componentes.

Tareas:

- Pasar `role` desde pages server.
- Ocultar editar/ajustar/eliminar para cashier.
- Ocultar anular venta para cashier.
- Mantener server actions robustas ante 403.

### 6. Import Image owner-only

Archivos probables:

- `apps/web/app/(app)/dashboard/imports/page.tsx`
- `apps/web/app/(app)/dashboard/imports/[importId]/page.tsx`
- `apps/web/src/features/imports/components/ImportUploadPanel.tsx`
- `apps/web/src/features/imports/components/ImportReviewTable.tsx`
- `apps/web/src/features/imports/components/ImportCancelDialog.tsx`

Tareas:

- Bloquear pagina completa para cashier en Sprint 1.
- Mantener `ImportConfirmPanel` con su check actual.
- Agregar check para cancel/review si los componentes quedan accesibles en tests.

## Tests Requeridos

### Backend

1. `test_seed_creates_cashier_user`
2. `test_dev_login_can_return_cashier`
3. `test_auth_me_returns_cashier_role_when_logged_as_cashier`
4. `test_cashier_can_list_products`
5. `test_cashier_can_create_sale`
6. `test_cashier_cannot_create_product`
7. `test_cashier_cannot_update_product`
8. `test_cashier_cannot_adjust_stock`
9. `test_cashier_cannot_create_inventory_import`
10. `test_cashier_cannot_update_inventory_import_item`
11. `test_cashier_cannot_cancel_inventory_import`
12. `test_cashier_cannot_void_sale`
13. `test_cashier_cannot_export_csv`
14. `test_cashier_cannot_update_store`
15. `test_cashier_cannot_manage_users`

### Frontend unit/component

1. `permissions_owner_can_manage_admin_actions`
2. `permissions_cashier_can_only_operate_sales_and_read`
3. `AppSidebar_hides_imports_and_settings_for_cashier`
4. `AppSidebar_shows_admin_items_for_owner`
5. `ProductTable_hides_admin_actions_for_cashier`
6. `ProductDetail_hides_edit_and_stock_adjust_for_cashier`
7. `SaleDetail_hides_void_action_for_cashier`
8. `ImportConfirmPanel_still_blocks_cashier`
9. `SettingsPage_or_SettingsOverview_blocks_cashier`

### Optional E2E

1. Login as cashier.
2. Sidebar does not show Import Image or Ajustes.
3. Cashier can open POS and create a sale.
4. Cashier cannot access `/dashboard/products/new`.
5. Cashier cannot access `/dashboard/settings`.

## Validacion Manual

Backend:

```powershell
cd apps/backend
py -m pytest tests -q -p no:cacheprovider
py -m ruff check src tests --no-cache
```

Web:

```powershell
cd apps/web
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Manual con dev server:

```powershell
cd apps/backend
py -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

```powershell
cd apps/web
corepack pnpm dev
```

Validar:

- Owner ve todas las rutas actuales.
- Cashier ve Dashboard, POS, Productos, Ventas y Reportes.
- Cashier no ve Import Image ni Ajustes.
- Cashier puede crear una venta.
- Cashier no puede crear/editar producto ni ajustar stock.
- Cashier no puede anular venta.
- Cashier no puede exportar CSV.
- URL directa a pagina owner-only muestra forbidden o redirige de forma consistente.

## Criterios de Aceptacion

- Seed local crea owner y cashier demo de forma idempotente.
- Dev login permite probar ambos roles sin editar datos manualmente.
- Backend rechaza con 403 todas las acciones owner-only cuando el rol es cashier.
- Backend permite a cashier operar POS, crear ventas y consultar productos/ventas/reportes.
- Frontend no muestra rutas ni botones administrativos a cashier.
- Frontend maneja 403 aunque la accion no deberia estar visible.
- Tests backend y frontend cubren la matriz Sprint 1.
- No se introducen tablas RBAC ni flujo de invitaciones en este sprint.

## Riesgos y Decisiones

- **Bloquear importaciones completas a cashier:** es conservador. En un futuro se puede permitir que cashier cree borradores y owner confirme.
- **Reportes visibles para cashier:** aceptable para MVP, pero si el negocio considera ventas totales sensibles, mover reportes a owner-only en Sprint 2.
- **Exchange rates y photos quedan abiertos:** no son foco del sprint; revisar en hardening posterior.
- **Session web puede quedar vieja si cambia rol:** backend decide siempre. Refrescar session despues de cambios de rol queda para gestion de usuarios.
- **Local auth completo queda fuera:** `AUTH_PROVIDER=local` es valioso, pero mezclarlo ahora agranda el sprint. Para Sprint 1 basta con dev-login por rol.

## Siguiente Sprint Recomendado

Sprint 2 deberia enfocarse en gestion basica de usuarios e invitaciones:

- Pantalla real de usuarios.
- Invitar cajero por correo.
- Reenviar/revocar invitacion.
- Aceptar invitacion y crear password.
- Crear usuario local `cashier`.
- Refrescar session/rol tras cambios.

RBAC debe quedar para una fase posterior, cuando haya evidencia de que `owner` y `cashier` no alcanzan.
