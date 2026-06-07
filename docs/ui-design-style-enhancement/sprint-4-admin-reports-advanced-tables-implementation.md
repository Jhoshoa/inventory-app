# Sprint 4 premium: administracion, reportes y tablas avanzadas

Fecha: 2026-06-03

Estado: implementado

## Objetivo

Llevar la fundacion visual premium al resto de pantallas administrativas, reportes y tablas avanzadas, manteniendo intactos contratos de API, permisos, rutas, server actions, filtros y comportamiento de negocio.

Sprint 4 parte de Sprint 3 completado funcionalmente para Dashboard, POS, Productos e Imprimir etiquetas.

Este sprint tambien reemplaza los botones aislados de "volver" por una navegacion jerarquica reusable, responsive y consistente para toda la web.

## Resultado de implementacion

Implementado el 2026-06-03.

- Se agrego `Breadcrumbs` reusable e integrado con `PageHeader`.
- Se migraron componentes compartidos del alcance a tokens semanticos.
- Se reemplazaron botones manuales de "Volver" por navegacion jerarquica en rutas hijas prioritarias.
- Se migraron Ventas, detalle de venta, Reportes, Movimientos, Cierres, Ajustes y rutas secundarias de Productos a la fundacion premium.
- Se conservaron contratos de API, permisos, rutas, server actions, filtros y comportamiento de negocio.
- Se mantuvo Importaciones/OCR fuera de alcance por decision de producto.

Verificacion ejecutada:

- `corepack pnpm test`
- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm build`

## Skills a aplicar

- `next-best-practices`: mantener rutas App Router como Server Components cuando ya lo son, respetar `searchParams` async, conservar cargas paralelas con `Promise.all` y evitar mover data fetching de servidor a cliente.
- `vercel-react-best-practices`: mantener componentes pequenos, imports concretos de iconos, evitar recomputos innecesarios y no introducir Client Components sin necesidad.

## Alcance

### Componentes compartidos

Migrar primero componentes usados por multiples rutas administrativas:

- Navegacion jerarquica reusable, por ejemplo `Breadcrumbs` o `PageBreadcrumbs`
- `Pagination`
- `Label`
- `SummaryRow`
- `ErrorState`
- `ForbiddenState`
- `CollapsibleSection`

Objetivo:

- Reducir colores directos.
- Unificar estados informativos, error, warning y superficies.
- Evitar repetir fixes por pantalla.

### Navegacion jerarquica

Crear un componente reusable para mostrar de donde viene el usuario y como volver en la jerarquia de la aplicacion.

Componentes/archivos probables:

- `apps/web/src/components/layout/Breadcrumbs.tsx`
- `apps/web/src/components/layout/breadcrumbs.ts`
- `apps/web/src/components/layout/PageHeader.tsx`
- `apps/web/src/components/layout/Breadcrumbs.test.tsx`
- `apps/web/src/components/layout/PageHeader.test.tsx`

Requisitos:

- Integrarse con `PageHeader` para que las rutas puedan renderizar breadcrumbs arriba del titulo.
- Soportar items con `label`, `href` opcional y estado actual.
- Ser responsive: en mobile debe mantener lectura clara, truncar labels largos y evitar overflow horizontal.
- Usar tokens semanticos, no colores directos.
- Usar separadores visuales discretos, preferiblemente iconos de `lucide-react`.
- No depender de historial del navegador para rutas criticas; debe expresar jerarquia estable de la app.
- Permitir reemplazar botones secundarios de "Volver" cuando la navegacion jerarquica sea suficiente.
- Mantener botones de accion solo cuando representen una accion real, no navegacion estructural.
- Agregar tests de render, links, estado actual, truncado/clases responsive y compatibilidad con `PageHeader`.

Rutas prioritarias:

- `/dashboard/products/[productId]`
- `/dashboard/products/[productId]/edit`
- `/dashboard/products/new`
- `/dashboard/products/labels`
- `/dashboard/sales/[saleId]`
- `/dashboard/reports/stock-movements`
- `/dashboard/reports/cash-movements`
- `/dashboard/reports/store-days`
- `/dashboard/reports/store-days/[businessDayId]`
- `/dashboard/settings`

### Ventas

Rutas y componentes:

- `/dashboard/sales`
- `/dashboard/sales/[saleId]`
- `SalesDateFilter`
- `SalesTable`
- `SaleDetail`
- `VoidSaleDialog`
- `SaleStatusBadge`

Mejoras:

- `PageHeader` y `PageSection` consistentes.
- Filtros en `ResponsiveToolbar`.
- Tabla con tokens, overflow controlado y acciones compactas.
- Detalle de venta con totales y estados visuales premium.
- Dialog de anulacion con tokens y accesibilidad preservada.

### Reportes

Rutas y componentes:

- `/dashboard/reports`
- `DateRangeFilter`
- `SalesReportSummary`
- `PaymentMethodBreakdown`
- `TopProductsTable`
- `ExportPanel`

Mejoras:

- Resumen de ventas con cards operativas premium.
- Filtros de rango consistentes.
- Tablas contenidas y legibles.
- Exportes claros sin apariencia MVP.

### Movimientos y cierres

Rutas y componentes:

- `/dashboard/reports/stock-movements`
- `/dashboard/reports/cash-movements`
- `/dashboard/reports/store-days`
- `/dashboard/reports/store-days/[businessDayId]`
- `StockMovementFilters`
- `StockMovementsTable`
- `CashMovementsReportControls`
- `CashMovementsTable`
- `StoreDayReportsDateFilter`
- `StoreDayCloseReportView`
- `StoreDayClosingPreview`
- `StoreDayEventTimeline`

Mejoras:

- Filtros en `ResponsiveToolbar`.
- Cantidades positivas/negativas con tokens `status-success` y `status-danger`.
- Cierres diarios con jerarquia clara de resumen, detalle y libro de caja.
- Tablas con overflow controlado y estados vacios consistentes.

### Ajustes

Rutas y componentes:

- `/dashboard/settings`
- `SettingsOverview`
- `PermissionMatrix`
- `ProductCategorySettings`

Mejoras:

- Superficies premium para perfil, permisos y categorias.
- Tabla de permisos y categorias con tokens.
- Estados de guardado/toast con tokens semanticos.

### Productos secundarios

Rutas/componentes relacionados que quedaron fuera del Sprint 3 principal:

- `/dashboard/products/new`
- `/dashboard/products/[productId]`
- `/dashboard/products/[productId]/edit`
- `ProductForm`
- `ProductDetail`
- `ProductStockDialog`
- `ProductDeleteDialog`
- `ProductStockMovements`
- `QrPreviewDialog`
- `ProductTableSkeleton`

Mejoras:

- Completar consistencia visual alrededor del modulo Productos.
- Mantener formularios y dialogs sin cambios funcionales.

## Fuera de alcance

- Cambiar contratos de API.
- Agregar graficos nuevos.
- Rehacer tablas como mobile cards avanzadas.
- Cambiar permisos.
- Mejorar o redisenar la funcionalidad actual de Importaciones/OCR.
- Implementar importacion CSV nueva. Esa funcionalidad queda para un sprint futuro con alcance propio.
- Implementar QA visual completo con screenshots; queda para Sprint 5.

## Orden recomendado

1. Migrar componentes compartidos de bajo riesgo.
2. Crear navegacion jerarquica reusable e integrarla con `PageHeader`.
3. Reemplazar botones de "Volver" por breadcrumbs en rutas hijas prioritarias.
4. Migrar Ventas y Detalle de venta.
5. Migrar Reportes principales.
6. Migrar Movimientos y Cierres.
7. Migrar Ajustes y categorias.
8. Completar rutas secundarias de Productos.
9. Ejecutar tests relevantes, typecheck, lint y build.

## Criterios de aceptacion

- Rutas administrativas usan `PageHeader`, `PageSection`, tokens y superficies premium donde aplique.
- Filtros usan `ResponsiveToolbar` cuando hay varios controles.
- Tablas no introducen overflow horizontal del documento.
- Estados empty/loading/error son consistentes.
- Acciones compactas tienen nombre accesible y tooltip cuando el icono no es evidente.
- La navegacion jerarquica muestra ubicacion actual y rutas padre sin depender de botones manuales de "Volver".
- La navegacion jerarquica es responsive y no introduce overflow horizontal.
- Permisos existentes se mantienen.
- `pnpm test`, `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.

## Tests esperados

- Ventas: filtros, tabla, detalle y anulacion.
- Reportes: resumen, filtros, exportes, tablas de productos/metodos.
- Movimientos: filtros, signos de montos/cantidades, paginacion y tablas.
- Cierres: listado, detalle, libro de caja y eventos.
- Ajustes: overview, permisos y categorias.
- Navegacion jerarquica: render de items, links padres, estado actual, truncado/responsive y compatibilidad con `PageHeader`.
- Componentes compartidos: snapshots funcionales o pruebas de accesibilidad cuando ya existan tests.

Regla de Sprint 4:

- Cada bloque implementado debe agregar o actualizar tests de verificacion relevantes antes de considerarse cerrado.

## Riesgos

- Migrar componentes compartidos puede cambiar muchas pruebas por clases o estructura.
- La navegacion jerarquica puede duplicar acciones si convive sin criterio con botones manuales de "Volver".
- Tablas de reportes pueden tener datos anchos; el overflow debe quedar controlado por contenedores.
- Dialogs custom pueden tener deuda de accesibilidad; no introducir regresiones de foco o labels.

## Mitigaciones

- Hacer cambios por bloque y correr tests focalizados despues de cada bloque.
- Mantener props y contratos actuales.
- Preferir tokens existentes sobre nuevos tokens.
- Evitar crear nuevos Client Components salvo necesidad real.
- Implementar breadcrumbs como componente Server-compatible siempre que sea posible.
- Usar `Tooltip` solo cuando el icon button no sea autoexplicativo.
- Mantener commits pequenos por grupo de rutas.
