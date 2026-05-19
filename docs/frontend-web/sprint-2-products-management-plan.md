# Sprint 2 Web Products Management Plan

Fecha: 2026-05-19

## Objetivo

Implementar la gestion completa de productos en la web sobre la fundacion del Sprint 1. Al cerrar este sprint, una tienda debe poder listar, buscar, filtrar, crear, editar, eliminar y ajustar stock de productos desde `/dashboard/products`, usando los endpoints reales del backend y manteniendo pruebas unitarias, de componentes y E2E.

## Estado Actual

Sprint 1 dejo listo:

- Rutas reales `/dashboard` y `/dashboard/products`.
- Layout autenticado protegido por sesion.
- Proxy `/api/[...path]` hacia FastAPI.
- API client tipado con errores normalizados.
- Componentes UI base.
- Vitest, Testing Library, Playwright, ESLint y build funcionando.

Falta en productos:

- Tabla real conectada al backend.
- Busqueda, filtros, orden y paginacion.
- Formularios de crear/editar.
- Ajuste de stock con razon.
- Eliminacion con confirmacion y permisos.
- Detalle de producto con historial de movimientos.
- Tests de flujos reales de productos.

## Skills Aplicados

- `next-best-practices`: Server Components para carga inicial, Search Params async, Route Handlers/Server Actions para mutaciones.
- `vercel-react-best-practices`: evitar waterfalls, mantener tabla eficiente, limitar estado cliente y diferir interacciones costosas.
- `typescript-advanced-types`: DTOs estrictos, filtros tipados, estados discriminados y validacion de formularios.

## Alcance Incluido

- `GET /products` con `q`, `category`, `stock`, `limit`, `offset`, `sort`, `direction`.
- `POST /products` para crear producto.
- `GET /products/{product_id}` para detalle/edicion.
- `PATCH /products/{product_id}` para editar datos.
- `PATCH /products/{product_id}/stock` para ajuste de stock.
- `DELETE /products/{product_id}` con confirmacion.
- `GET /products/qr/{qr_code}` para busqueda por QR/codigo.
- `GET /products/{product_id}/stock-movements` para historial del producto.
- Estados loading, empty, error, forbidden y validation.

## Fuera de Alcance

- POS y carrito de venta.
- Importacion OCR masiva.
- Camara/lector QR real desde navegador.
- Export CSV desde UI.
- Offline web/IndexedDB.
- Edicion inline de tabla.

## Estructura Objetivo

```text
apps/web/
  app/(app)/dashboard/products/
    page.tsx
    loading.tsx
    new/page.tsx
    [productId]/page.tsx
    [productId]/edit/page.tsx
  src/features/products/
    api.ts
    actions.ts
    schemas.ts
    types.ts
    components/
      ProductTable.tsx
      ProductFilters.tsx
      ProductForm.tsx
      ProductStockDialog.tsx
      ProductDeleteDialog.tsx
      ProductDetail.tsx
      ProductStockMovements.tsx
```

Mantener Server Components para paginas y carga inicial. Usar Client Components solo para formularios, filtros interactivos, dialogos y botones de mutacion.

## Contratos Backend

### Listado

```http
GET /api/v1/products?q=&category=&stock=all|available|low|out&limit=50&offset=0&sort=name|stock|updated_at|price&direction=asc|desc
```

Respuesta:

```ts
interface ProductListResponse {
  items: Product[];
  total: number;
  limit: number;
  offset: number;
}
```

### Crear/Editar

Campos soportados:

- `name` requerido, 1-100 caracteres.
- `price` requerido, mayor a 0.
- `stock` requerido al crear, mayor o igual a 0.
- `category`, `unit`, `sku`, `cost_price`, `photo_url`, `qr_code`, `min_stock`.

### Ajustar Stock

```http
PATCH /api/v1/products/{product_id}/stock
```

Payload:

```json
{
  "quantity": 5,
  "reason": "Compra proveedor"
}
```

`quantity` es delta: positivo suma, negativo resta.

## UX y Pantallas

### Products List

La pantalla principal debe ser una herramienta de trabajo:

- Header compacto: titulo, contador, accion `Nuevo producto`.
- Toolbar: busqueda con debounce, filtro de stock, categoria, orden.
- Tabla con columnas: nombre, SKU/QR, categoria, precio, stock, minimo, estado, acciones.
- Acciones por fila: ver, editar, ajustar stock, eliminar.
- Paginacion backend con `limit` y `offset`.

Estados:

- Loading con skeleton de tabla.
- Empty general: accion para crear primer producto.
- Empty por filtro: limpiar filtros.
- Error: retry.
- Forbidden en eliminar si backend responde 403.

### Product Form

Formulario reutilizable para crear y editar:

- Campos requeridos: `name`, `price`, `stock` al crear.
- `stock` en edicion debe mostrarse, pero ajustes recomendados via dialogo de stock.
- Validacion client-side antes de submit.
- Errores 422 del backend mapeados a campos cuando sea posible.
- Submit con estado pendiente y bloqueo de doble envio.

### Product Detail

Vista de detalle:

- Datos principales del producto.
- Estado de stock: disponible, bajo, sin stock.
- QR/codigo visible si existe.
- Historial de movimientos paginado.
- Acciones: editar, ajustar stock.

## Patrones de Implementacion

### Data Fetching

- Paginas leen `searchParams` y llaman al backend desde servidor con token de cookie.
- La lista no debe cargar en Client Component si no hay necesidad.
- Filtros cambian la URL; esto hace la tabla compartible y testeable.
- Debounce en busqueda desde Client Component antes de actualizar URL.

### Mutaciones

Recomendacion: usar Server Actions para crear, editar, ajustar stock y eliminar.

Razones:

- Reutilizan cookies httpOnly sin exponer tokens.
- Centralizan validaciones y mapping de errores.
- Permiten `revalidatePath("/dashboard/products")` o redirect despues de crear.

Si Server Actions complican demasiado los tests, usar Route Handlers internos bajo `/api/products/*`, pero mantener el token solo en servidor.

### Tipos y Validacion

Crear DTOs locales mientras OpenAPI generado no este integrado automaticamente:

```ts
type ProductStockFilter = "all" | "available" | "low" | "out";
type ProductSortField = "name" | "stock" | "updated_at" | "price";
type SortDirection = "asc" | "desc";
```

Usar helpers puros para validar formularios, sin `any`, testeados con Vitest. Si se agrega Zod, hacerlo solo si realmente reduce complejidad de formularios; para este sprint validadores propios son suficientes.

## Componentes UI Necesarios

Extender UI base con:

- `Select` o `SegmentedControl` para filtros.
- `Textarea` para razon de ajuste de stock.
- `Pagination`.
- `ConfirmDialog` usando `DialogSurface`.
- `FieldError`.
- `NumberInput` o wrapper para precio/stock.

No agregar una libreria de tabla pesada. Para 1000 productos y paginacion backend, una tabla semantica con server pagination es suficiente.

## Tests Requeridos

### Unit/API

1. `parseProductSearchParams_applies_defaults`
2. `buildProductQueryString_serializes_filters`
3. `validateProductForm_rejects_missing_name`
4. `validateProductForm_rejects_non_positive_price`
5. `validateStockAdjustment_rejects_zero_quantity`
6. `productsApi_normalizes_list_response`

### Componentes

7. `ProductTable_renders_rows_and_stock_badges`
8. `ProductTable_renders_empty_state`
9. `ProductFilters_updates_search_params`
10. `ProductForm_shows_field_errors`
11. `ProductStockDialog_requires_reason_for_negative_adjustment`
12. `ProductDeleteDialog_requires_confirmation`

### E2E

13. `products_page_lists_mocked_products`
14. `product_filters_update_url`
15. `create_product_validates_required_fields`
16. `create_product_success_redirects_to_products`
17. `edit_product_success_updates_row`
18. `stock_adjustment_updates_stock`
19. `delete_product_forbidden_shows_error`

Usar Playwright con mocks de route handlers/backend cuando no sea necesario levantar FastAPI real.

## Comandos de Validacion

```powershell
cd apps/web
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

Validacion opcional con backend real:

```powershell
cd apps/backend
python -m uvicorn src.main:app --reload
```

Luego en web:

```powershell
cd apps/web
corepack pnpm dev
```

## Criterios de Aceptacion

- `/dashboard/products` lista productos reales del tenant autenticado.
- Busqueda, filtros, sort y paginacion modifican URL y consultan backend.
- Crear producto valida campos y persiste via backend.
- Editar producto actualiza datos sin romper stock auditado.
- Ajustar stock usa delta y razon.
- Eliminar producto pide confirmacion y muestra 403 si no hay permiso owner.
- Detalle de producto muestra datos y stock movements.
- Todos los estados de UI estan cubiertos: loading, empty, error, forbidden, validation.
- `typecheck`, `lint`, `test`, `test:e2e` y `build` pasan.

## Riesgos y Decisiones

- **OpenAPI generado:** Sprint 1 dejo script. En Sprint 2 se puede seguir con tipos manuales estrictos si el backend no esta corriendo; no bloquear implementacion por generacion automatica.
- **Stock en edit:** aunque backend permite `stock` en `PATCH /products/{id}`, la UI debe preferir ajuste por dialogo para mantener auditoria clara.
- **Delete owner-only:** frontend debe mostrar error claro, pero no ocultar seguridad en cliente; backend decide.
- **Categorias:** no hay endpoint dedicado. Inicialmente usar filtro por texto o derivar categorias de pagina actual; endpoint de categorias puede quedar para otro sprint si hace falta.
- **QR scan:** lookup por QR se puede implementar como campo de busqueda/codigo; camara queda fuera.

## Resultado Esperado

Al cerrar Sprint 2, productos deja de ser placeholder y se convierte en la primera pantalla operativa real de la web. Esto prepara Sprint 3 para POS, porque el carrito necesita busqueda rapida, stock confiable y productos bien gestionados.
