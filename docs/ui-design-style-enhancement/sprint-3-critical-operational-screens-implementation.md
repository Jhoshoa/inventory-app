# Sprint 3 premium: pantallas operativas criticas

Fecha: 2026-06-03

## Objetivo

Migrar las pantallas operativas de mayor uso diario al sistema visual premium existente, sin cambiar contratos de API, permisos, rutas, datos ni comportamiento de negocio.

El sprint parte de una fundacion ya creada en sprints previos: tokens semanticos, componentes UI compartidos, `PageContainer`, `PageSection`, `ResponsiveActions`, `ResponsiveToolbar`, `Tooltip` y shell principal refinado.

## Estado inicial

- Dashboard tiene una primera implementacion premium con KPIs, tabs de periodo, tasas y tests.
- POS funciona, pero conserva superficies y estados visuales MVP.
- Productos funciona, pero sus filtros, tabla y acciones todavia no usan completamente la fundacion premium.
- Imprimir etiquetas funciona, pero la composicion de busqueda, configuracion, seleccionados y preview necesita una jerarquia visual mas clara.
- Hay colores directos `slate-*`, `red-*`, `amber-*` y `emerald-*` en componentes incluidos en el alcance.

## Skills aplicados

- `next-best-practices`: mantener data fetching en Server Components, respetar `searchParams` async de App Router y evitar mover rutas completas a cliente.
- `vercel-react-best-practices`: conservar componentes pequenos, evitar renders innecesarios, mantener imports concretos de iconos y derivar estado simple durante render.

## Alcance

### Dashboard

- Corregir copy temporal del empty state.
- Migrar `StoreDayStatusPanel` a tokens semanticos porque aparece en la primera pantalla operativa.
- Mantener `DashboardPage` como Server Component con carga paralela.
- Mantener tests existentes y ajustar expectativas si cambia markup o copy.

### POS

- Usar `PageHeader` en la ruta.
- Reforzar la busqueda/escaneo como accion primaria.
- Migrar `PosProductSearch`, `PosProductResults`, `PosCart` y `PosCheckoutPanel` a tokens semanticos.
- Mantener el carrito estable en desktop y usable en mobile.
- Preservar reducer, acciones de checkout y refresco de stock.

### Productos

- Migrar `ProductFilters` a `ResponsiveToolbar`.
- Migrar contenedor, paginacion y filas a tokens semanticos.
- Mantener la tabla con el componente `Table`.
- Mejorar lectura de producto, SKU, codigo, categoria, precio, stock y estado.
- Compactar acciones repetidas cuando sea razonable, usando iconos y `Tooltip` sin perder accesibilidad.

### Imprimir etiquetas

- Reorganizar busqueda, filtros, configuracion, resumen, resultados, seleccionados y preview con superficies premium.
- Mantener los controles de impresion, exportacion SVG, cantidad maxima y preview.
- Mejorar mobile sin cambiar la logica de seleccion ni exportacion.

## Fuera de alcance

- Cambiar endpoints o schemas.
- Agregar graficos.
- Cambiar comportamiento de permisos.
- Rehacer reportes, ventas, importaciones o ajustes.
- Implementar breadcrumbs globales completos, salvo preparacion minima si una ruta tocada lo requiere.
- Convertir todas las tablas del sistema a mobile cards.

## Orden de implementacion

1. Cerrar pendientes del Dashboard.
2. Migrar POS.
3. Migrar Productos.
4. Migrar Imprimir etiquetas.
5. Actualizar tests relevantes.
6. Ejecutar verificacion web.

## Criterios de aceptacion

- `/dashboard`, `/dashboard/pos`, `/dashboard/products` y `/dashboard/products/labels` mantienen funcionalidad existente.
- Empty, loading, error y data states siguen visibles.
- Las pantallas del alcance usan tokens semanticos en los cambios nuevos.
- No se introduce overflow horizontal del documento en mobile.
- Las acciones principales son visibles, accesibles y faciles de usar.
- Icon buttons tienen nombre accesible y tooltip cuando el significado no es obvio.
- `pnpm typecheck` pasa.
- `pnpm lint` pasa.
- Tests relevantes pasan.
- `pnpm build` pasa.

## Tests esperados

- Dashboard: copy del empty state, tasas, stock bajo y estados de error.
- POS: carrito, busqueda/resultados y checkout conservan comportamiento.
- Productos: filtros, tabla, acciones segun permisos y estados de stock.
- Etiquetas: seleccion, cantidades, limites, exportacion/impresion habilitada y estados vacios.

## Riesgos

- Cambios visuales en componentes compartidos pueden afectar pruebas existentes por clases o estructura.
- Acciones de tabla compactadas pueden perder claridad si no tienen labels accesibles.
- Etiquetas tiene reglas de impresion; los estilos `print-*` deben preservarse.
- POS combina reducer local, fetch cliente y server action; el rediseño no debe acoplar esos flujos.

## Mitigaciones

- Mantener cambios por pantalla y revisar tests despues de cada bloque.
- Preferir tokens y componentes existentes sobre nuevas abstracciones.
- No mover data fetching de Server Components a Client Components.
- Mantener props y contratos actuales.
- Conservar clases de impresion necesarias en etiquetas.
