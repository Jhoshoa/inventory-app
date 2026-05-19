# Sprint 3 Web POS and Sales Plan

Fecha: 2026-05-19

## Objetivo

Implementar el flujo operativo de ventas en la web: POS simple, busqueda rapida de productos, carrito, confirmacion de venta, historial, detalle y anulacion. Este sprint debe convertir la web en una herramienta usable para vender en tienda, apoyandose en el modulo de productos terminado en Sprint 2.

## Estado Actual

Ya existe:

- Auth web con cookies httpOnly y rutas protegidas.
- Proxy/API client hacia FastAPI.
- Dashboard inicial.
- Productos completos: listado, filtros, crear/editar, stock y detalle.
- UI base, formularios, dialogos, tests unitarios y E2E.

Falta:

- Ruta POS real.
- Estado local de carrito.
- Busqueda compacta de productos para venta.
- Validacion de stock antes de confirmar.
- Confirmacion de venta contra backend.
- Historial y detalle de ventas.
- Anulacion de venta con razon y permisos owner.
- Feedback claro cuando backend rechaza por stock insuficiente o permisos.

## Skills Aplicados

- `next-best-practices`: Server Components para historial/detalle, Client Components solo para POS y carrito, Server Actions para mutaciones.
- `vercel-react-best-practices`: evitar waterfalls, mantener busqueda rapida, reducir re-renders del carrito y cargar componentes pesados solo en POS.
- `typescript-advanced-types`: carrito tipado, estados discriminados, DTOs estrictos para ventas y validaciones de stock.

## Alcance Incluido

- `GET /products/pos?q=&limit=&offset=` para busqueda compacta en POS.
- `POST /sales` para confirmar venta.
- `GET /sales` para historial inicial.
- `GET /sales/{sale_id}` para detalle.
- `POST /sales/{sale_id}/void` para anulacion.
- Nueva ruta `/dashboard/pos`.
- Completar `/dashboard/sales`.
- Crear `/dashboard/sales/[saleId]`.
- Estados loading, empty, error, validation y forbidden.

## Fuera de Alcance

- Pagos integrados o facturacion fiscal.
- Ticket PDF o impresion real.
- Devoluciones parciales por item.
- Sync/offline POS.
- Escaner de camara real para QR.
- Filtros avanzados de ventas por rango, hasta que backend los exponga.

## Estructura Objetivo

```text
apps/web/
  app/(app)/dashboard/pos/page.tsx
  app/(app)/dashboard/sales/page.tsx
  app/(app)/dashboard/sales/[saleId]/page.tsx
  src/features/pos/
    types.ts
    schemas.ts
    api.ts
    actions.ts
    components/
      PosWorkspace.tsx
      PosProductSearch.tsx
      PosProductResults.tsx
      PosCart.tsx
      PosCheckoutPanel.tsx
  src/features/sales/
    types.ts
    api.ts
    actions.ts
    components/
      SalesTable.tsx
      SaleDetail.tsx
      VoidSaleDialog.tsx
      SaleStatusBadge.tsx
```

## Contratos Backend

### Buscar Productos POS

```http
GET /api/v1/products/pos?q=arroz&limit=20&offset=0
```

Respuesta compacta:

```ts
interface ProductCompact {
  id: string;
  name: string;
  price: string;
  stock: number;
  unit: string;
  qr_code: string | null;
}
```

### Crear Venta

```http
POST /api/v1/sales
```

Payload:

```json
{
  "items": [{ "product_id": "uuid", "quantity": 2 }],
  "payment_method": "efectivo",
  "device_id": "web-pos",
  "customer_name": "Cliente"
}
```

Reglas UI:

- No permitir venta sin items.
- No permitir cantidad mayor al stock cargado.
- Revalidar errores del backend, porque el stock pudo cambiar.
- Mostrar total antes de confirmar.

### Historial y Detalle

```http
GET /api/v1/sales
GET /api/v1/sales/{sale_id}
```

### Anular Venta

```http
POST /api/v1/sales/{sale_id}/void
```

Payload:

```json
{ "reason": "Cliente cancelo la compra" }
```

Reglas:

- Requiere razon.
- Backend valida rol owner.
- Si responde 403, mostrar mensaje de permisos.
- Si venta ya esta `voided`, mostrar estado y bloquear boton.

## UX y Pantallas

### POS

Layout recomendado:

- Columna izquierda: busqueda y resultados de productos.
- Columna derecha: carrito fijo con total y checkout.
- En mobile: carrito como panel inferior o seccion despues de resultados.

Flujo:

1. Usuario busca por nombre, SKU/QR escrito o codigo.
2. Resultados muestran nombre, precio, stock y boton agregar.
3. Agregar producto suma cantidad si hay stock disponible.
4. Carrito permite incrementar, disminuir y remover.
5. Checkout captura metodo de pago y cliente opcional.
6. Confirmar venta ejecuta Server Action y redirige a detalle de venta.

Estados:

- Busqueda vacia: sugerir escribir producto.
- Sin resultados: mostrar mensaje compacto.
- Producto sin stock: boton deshabilitado.
- Error de backend: alert con retry.
- Venta exitosa: redirect a `/dashboard/sales/{saleId}`.

### Historial de Ventas

Tabla inicial:

- Fecha.
- Estado.
- Metodo de pago.
- Items.
- Total.
- Acciones: ver.

Como backend aun no expone filtros/paginacion de ventas, el primer historial puede consumir `GET /sales` directo. Si la lista crece, Sprint 4 debe pedir filtros por rango/paginacion.

### Detalle de Venta

Debe mostrar:

- Estado `completed` o `voided`.
- Fecha.
- Metodo de pago.
- Items con nombre, cantidad, precio y subtotal.
- Total.
- Razon/fecha de anulacion si aplica.
- Boton anular si esta `completed`.

## Patrones de Implementacion

### POS como Client Component

El POS necesita estado local de carrito y busqueda. Usar Client Components acotados:

- `PosWorkspace` maneja estado del carrito.
- `PosProductSearch` maneja query con debounce.
- `PosCart` recibe items y callbacks.
- Mutacion de venta via Server Action para usar cookies httpOnly.

Evitar Zustand por ahora. `useReducer` local es suficiente y mas testeable. Zustand queda reservado para estado que deba vivir entre pantallas, como un carrito persistente futuro.

### Busqueda

- Debounce de 250-300ms.
- Minimo recomendado: buscar con 1+ caracteres.
- Usar `/api/products/pos` interno o Server Action auxiliar si hace falta.
- No cargar todos los productos al cliente.

### Carrito Tipado

Usar estado discriminado para checkout:

```ts
type CheckoutState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; saleId: string }
  | { status: "error"; message: string };
```

Validar:

- Cantidad entera y mayor a 0.
- Cantidad no mayor a stock disponible.
- Total calculado desde items seleccionados.
- Backend sigue siendo fuente final de verdad.

## Componentes UI Necesarios

- `QuantityStepper` para sumar/restar unidades.
- `SearchCombobox` simple o buscador con resultados.
- `SaleStatusBadge`.
- `VoidSaleDialog` con textarea de razon.
- `SummaryRow` para subtotal/total.

Mantener UI de herramienta operativa: compacta, clara, sin hero ni tarjetas decorativas.

## Tests Requeridos

### Unit

1. `posReducer_adds_product_to_cart`
2. `posReducer_increments_existing_item`
3. `posReducer_prevents_quantity_above_stock`
4. `posReducer_removes_item`
5. `calculateCartTotal_returns_expected_total`
6. `validateCheckout_rejects_empty_cart`
7. `validateVoidSale_rejects_empty_reason`

### Componentes

8. `PosProductResults_disables_out_of_stock_products`
9. `PosCart_renders_total_and_items`
10. `PosCheckoutPanel_blocks_empty_cart`
11. `SalesTable_renders_completed_and_voided_status`
12. `SaleDetail_renders_items_and_total`
13. `VoidSaleDialog_shows_permission_error`

### E2E

14. `pos_adds_product_to_cart`
15. `pos_prevents_over_stock_quantity`
16. `pos_checkout_validation_requires_items`
17. `pos_success_redirects_to_sale_detail`
18. `sales_history_opens_sale_detail`
19. `void_sale_requires_reason`

Usar mocks de `fetch`/Route Handlers en Playwright cuando no se quiera depender de FastAPI real. Mantener al menos una prueba manual opcional con backend local.

## Comandos de Validacion

```powershell
cd apps/web
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

Opcional con backend real:

```powershell
cd apps/backend
python -m uvicorn src.main:app --reload
```

## Criterios de Aceptacion

- `/dashboard/pos` permite buscar productos compactos.
- Productos sin stock no pueden agregarse al carrito.
- Carrito permite aumentar, reducir y remover items.
- Total se calcula correctamente.
- Confirmar venta llama `POST /sales` y redirige al detalle.
- `/dashboard/sales` lista ventas.
- `/dashboard/sales/{saleId}` muestra detalle completo.
- Anular venta exige razon y muestra errores 403/409 correctamente.
- Stock visual se actualiza al volver a productos/dashboard despues de venta o anulacion.
- `typecheck`, `lint`, `test`, `test:e2e` y `build` pasan.

## Riesgos y Decisiones

- **Ventas sin paginacion backend:** aceptable para v1 inicial; si crece rapido, Sprint 4 debe pedir filtros por rango y limit/offset.
- **Stock concurrente:** UI valida stock local, pero backend puede rechazar por cambios concurrentes. Mostrar error sin asumir que la UI tenia la verdad final.
- **QR real:** escribir/pegar QR en buscador es suficiente para este sprint; camara queda para mobile o hardening posterior.
- **Carrito persistente:** no persistir en localStorage todavia; reduce riesgos de vender con datos viejos.
- **Anulacion owner-only:** la UI puede mostrar boton, pero el backend decide. El caso 403 debe estar testeado.

## Resultado Esperado

Al cerrar Sprint 3, la web debe permitir operar ventas reales: buscar productos, armar carrito, confirmar venta, revisar historial y anular ventas con auditoria. Esto deja lista la base para Sprint 4: reportes, exports, movimientos globales y permisos mas visibles.
