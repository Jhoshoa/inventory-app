# Analisis de ajuste visual y UX para web

Fecha: 2026-05-22

## Objetivo

Elevar la UI web a un nivel mas profesional, consistente y facil de navegar sin cambiar la logica principal del producto. La meta no es "decorar" la app, sino convertirla en una herramienta de trabajo clara para inventario, POS, ventas, reportes e importaciones.

El enfoque recomendado es crear un sistema visual centralizado y luego migrar las pantallas por fases. Esto evita que cada pagina tenga estilos propios, reduce inconsistencias y hace mas facil mantener responsive, espaciado, colores, botones, tablas y estados.

## Estado actual observado

La app ya tiene una base buena:

- Next.js App Router con layout principal en `apps/web/src/components/layout/AppShell.tsx`.
- Sidebar fija desktop en `AppSidebar.tsx`.
- Header superior en `AppHeader.tsx`.
- Componentes UI compartidos en `apps/web/src/components/ui`.
- Tailwind configurado en `apps/web/tailwind.config.ts`.
- Estilos globales minimos en `apps/web/app/globals.css`.

Problemas actuales:

- La paleta esta muy limitada y dispersa: predominan clases `slate-*` directas en componentes y paginas.
- No hay tokens centralizados para surface, border, text, muted, danger, warning, success, focus, etc.
- Las paginas repiten encabezados con `h1`, descripcion y acciones, pero no hay un componente comun de `PageHeader`.
- No existe breadcrumb visible para entender jerarquia: por ejemplo `Dashboard / Productos / Editar producto`.
- En desktop hay sidebar, pero en mobile no se ve una navegacion equivalente clara.
- Acciones de tablas usan botones de texto como `Ver`, `Editar`, `Eliminar`; en tablas densas conviene mover varias acciones a iconos con tooltip o menu.
- Los espaciados son razonables, pero no estan gobernados por un sistema de density/layout.
- Las tablas son simples; para uso operativo necesitan mejor comportamiento responsive, columnas prioritarias y acciones compactas.
- Los estados vacio/error/loading existen, pero podrian unificarse visualmente.

## Principios de diseno

1. La app debe sentirse como herramienta operativa, no landing page.
2. Priorizar lectura rapida, comparacion y accion repetida.
3. Mantener informacion importante arriba: tienda, pagina actual, estado, acciones primarias.
4. Reducir ruido visual: menos tarjetas decorativas, mas layout denso y ordenado.
5. Los colores deben comunicar estado y jerarquia, no solo verse bonitos.
6. Botones con texto para acciones primarias; iconos para acciones repetidas, secundarias o compactas.
7. Cada pagina debe tener breadcrumb, titulo, descripcion corta y acciones coherentes.
8. Mobile debe tener navegacion real, no solo esconder la sidebar.
9. Responsive debe ser disenado por prioridad de informacion, no solo por columnas que se apilan.

## Sistema visual centralizado

Recomiendo crear tokens semanticos en Tailwind y/o CSS variables. La UI no deberia depender de `slate-950`, `slate-600`, `red-600` en todos lados. Debe consumir nombres semanticos.

Propuesta de tokens:

```ts
colors: {
  app: {
    background: "var(--color-app-background)",
    surface: "var(--color-app-surface)",
    surfaceMuted: "var(--color-app-surface-muted)",
    border: "var(--color-app-border)",
    borderStrong: "var(--color-app-border-strong)",
  },
  text: {
    strong: "var(--color-text-strong)",
    body: "var(--color-text-body)",
    muted: "var(--color-text-muted)",
    disabled: "var(--color-text-disabled)",
    inverse: "var(--color-text-inverse)",
  },
  brand: {
    50: "...",
    100: "...",
    500: "...",
    600: "...",
    700: "...",
  },
  status: {
    success: "...",
    successBg: "...",
    warning: "...",
    warningBg: "...",
    danger: "...",
    dangerBg: "...",
    info: "...",
    infoBg: "...",
  }
}
```

Paleta sugerida:

- Fondo app: gris muy claro neutro.
- Superficies: blanco y gris frio muy bajo.
- Texto principal: casi negro, no negro puro.
- Texto secundario: gris medio.
- Brand: azul profesional o teal profundo, usado solo para acciones primarias, foco y navegacion activa.
- Success: emerald.
- Warning: amber.
- Danger: red.
- Info: sky/blue.

Evitaria una UI dominada por un solo color. La app debe verse sobria, con acentos funcionales.

## Espaciado y layout

Crear constantes visuales o clases convencionales:

- `PageContainer`: ancho maximo, padding horizontal responsive y padding vertical.
- `PageHeader`: breadcrumb, titulo, descripcion, acciones.
- `PageSection`: separacion vertical estandar.
- `Toolbar`: filtros, busqueda y acciones secundarias.
- `DataPanel`: tablas, listas o graficos con borde/surface consistente.

Espaciado recomendado:

- Mobile: `px-4`, `py-4`, gap principal `4`.
- Tablet: `px-6`, `py-5`, gap principal `5`.
- Desktop: `px-8`, `py-6`, gap principal `6`.
- Formularios: gap vertical `4`, grupos relacionados `6`.
- Tablas: celdas `px-4 py-3`, modo compacto opcional `px-3 py-2`.

No recomiendo que cada pagina decida su propio `space-y-6`; deberia venir de una estructura compartida.

## Navegacion y breadcrumbs

Se debe agregar una jerarquia visible en la parte superior de cada pagina:

```text
Dashboard / Productos / Editar producto
```

Componente recomendado:

- `Breadcrumbs`
- `PageHeader`
- Configuracion central de rutas con labels e iconos.

Ejemplos:

- `/dashboard` -> `Dashboard`
- `/dashboard/products` -> `Dashboard / Productos`
- `/dashboard/products/new` -> `Dashboard / Productos / Nuevo producto`
- `/dashboard/products/[productId]` -> `Dashboard / Productos / Detalle`
- `/dashboard/products/[productId]/edit` -> `Dashboard / Productos / Editar`
- `/dashboard/sales/[saleId]` -> `Dashboard / Ventas / Detalle`
- `/dashboard/reports/stock-movements` -> `Dashboard / Reportes / Movimientos de stock`
- `/dashboard/imports/[importId]` -> `Dashboard / Importaciones / Revision`

Regla importante:

- El breadcrumb sirve para volver a paginas padre.
- El boton "Volver" solo se usa cuando hay flujo especifico o riesgo de perder contexto.
- En paginas hijas, el primer link de accion secundaria puede ser "Volver a productos" o similar, pero el breadcrumb debe estar siempre.

## Navegacion mobile

Actualmente la sidebar es desktop. Para mobile se necesita una alternativa:

1. Header con boton menu.
2. Drawer lateral con los mismos items de `AppSidebar`.
3. Indicar pagina activa.
4. Cerrar drawer al navegar.
5. Mantener acciones principales visibles en el page header.

No recomiendo bottom navigation para esta app por ahora, porque tiene varias secciones administrativas y el numero de items creceria rapido. Un drawer es mas escalable.

## Estados activos en sidebar

La sidebar deberia marcar la ruta activa:

- Item activo con fondo `brand/neutral`.
- Icono y texto con mayor contraste.
- Soporte para rutas hijas: si estamos en `/dashboard/products/123/edit`, `Productos` debe verse activo.

Esto ayuda mucho a ubicarse.

## Botones e iconos

Botones actuales son funcionales, pero se puede mejorar la jerarquia:

Tipos recomendados:

- `primary`: accion principal de la pantalla.
- `secondary`: accion secundaria visible.
- `ghost`: accion de bajo peso.
- `danger`: accion destructiva.
- `icon`: boton cuadrado para tablas/toolbars.
- `link`: navegacion textual cuando aplica.

Acciones con texto:

- Crear producto.
- Confirmar venta.
- Guardar cambios.
- Importar archivo.
- Exportar reporte.

Acciones con icono:

- Ver detalle: `Eye`.
- Editar: `Pencil`.
- Eliminar: `Trash2`.
- Descargar: `Download`.
- Imprimir: `Printer`.
- Refrescar: `RefreshCw`.
- Buscar/escanear: `Search`, `ScanLine`, `QrCode`.

Toda accion solo-icono debe tener:

- `aria-label`.
- Tooltip visible en hover/focus.
- Tamano estable, por ejemplo `h-9 w-9`.

En tablas, recomendaria mover `Ver`, `Editar`, `Eliminar` a iconos con tooltip, y dejar texto para acciones mas importantes o poco frecuentes.

## Tablas

Las tablas son centrales para productos, ventas, importaciones y reportes. Mejoras recomendadas:

- Header sticky opcional en tablas largas.
- Fila hover suave.
- Columna de acciones alineada a la derecha.
- Columnas numericas alineadas a la derecha.
- Badges de estado consistentes.
- Skeleton loading compartido.
- Empty state dentro de tabla cuando no hay datos.
- En mobile, transformar tablas anchas a cards compactas o esconder columnas secundarias.

Prioridad por entidad:

- Productos mobile: mostrar nombre, SKU/codigo, stock, precio, estado, menu acciones.
- Ventas mobile: fecha, total, metodo, estado, accion detalle.
- Importaciones mobile: archivo, estado, fecha, resumen, accion revisar.
- Reportes mobile: priorizar cards/resumen y tablas simples.

## Formularios

Crear una capa consistente para formularios:

- `FormField`
- `FormLabel`
- `FormHint`
- `FormError`
- `FieldGroup`
- `FormActions`

Reglas:

- Labels siempre visibles.
- Placeholder solo como ejemplo, no como label.
- Errores cerca del campo.
- Acciones al final alineadas consistentemente.
- En desktop, formularios administrativos pueden usar grid de 2 columnas.
- En mobile, una columna.

Para productos, campos como SKU y codigo escaneable deben beneficiarse de este sistema.

## PageHeader

Cada pagina deberia tener una estructura similar:

```tsx
<PageHeader
  breadcrumbs={[...]}
  title="Productos"
  description="Busca, filtra y administra el inventario de la tienda."
  actions={<Button>Nuevo producto</Button>}
/>
```

Beneficios:

- Evita repetir markup.
- Permite breadcrumb consistente.
- Permite acciones responsive.
- Controla spacing entre header y contenido.
- Ayuda con paginas hijas.

## Acciones por pagina

Dashboard:

- Mantenerlo como resumen ejecutivo.
- Cards de metricas mas consistentes.
- Ultimas ventas con acciones rapidas a detalle si aplica.
- Mejorar jerarquia visual entre KPIs y tablas.

POS:

- Debe ser la pantalla mas eficiente.
- Input de busqueda/escaneo muy visible.
- Carrito siempre claro.
- Botones de cantidad compactos y estables.
- Alertas de stock visibles sin bloquear todo el flujo.
- En desktop, producto/busqueda y carrito en columnas.
- En mobile, carrito puede ir debajo o en panel desplegable.

Productos:

- Toolbar clara: busqueda, filtros, crear.
- Tabla con acciones por icono.
- Stock con badge y color.
- SKU/codigo escaneable presentados como datos distintos.

Ventas:

- Filtros de fecha/estado/metodo.
- Tabla con fecha, total, metodo, estado y accion detalle.
- Detalle con resumen superior y items debajo.

Reportes:

- Filtros en toolbar.
- KPIs arriba.
- Graficos/tablas debajo.
- Exportar como accion secundaria persistente.

Importaciones:

- Flujo tipo wizard o pasos: subir, revisar, confirmar.
- Estados muy claros.
- Errores de importacion con filas editables y mensajes precisos.

Ajustes:

- Dividir por secciones.
- Permisos en tabla mas compacta y legible.

## Responsive

Breakpoints practicos:

- Mobile: hasta 640px.
- Tablet: 641px a 1024px.
- Desktop: 1025px en adelante.

Reglas:

- No depender solo de `grid-cols-*`; decidir que informacion se mantiene.
- Evitar botones que se rompan por texto largo.
- Acciones principales pueden ocupar ancho completo en mobile.
- Toolbars deben apilar filtros con buen gap.
- Tablas anchas deben tener modo card o scroll controlado.
- Header sticky debe dejar espacio para contenido y no tapar modales/dropdowns.

## Accesibilidad

Minimo recomendado:

- Contraste WCAG AA para texto y botones.
- Focus ring visible y consistente.
- `aria-label` en icon buttons.
- Tooltips accesibles por focus.
- Dialogs con titulo y cierre por Escape.
- Estados de error anunciables.
- No depender solo del color para estados.

## Performance y arquitectura React/Next

Recomendaciones:

- Mantener layout y headers como Server Components cuando sea posible.
- Convertir a Client Components solo interacciones reales: drawer mobile, tooltips, dialogs.
- Evitar importar librerias pesadas globalmente.
- Iconos: importar iconos concretos desde `lucide-react`.
- Componentes pesados o modales avanzados pueden cargarse cuando se abren.
- No duplicar data fetching en componentes cliente si la pagina ya puede cargar datos en servidor.

## Implementacion recomendada ahora

Fase 1: Fundacion visual

- Crear tokens centralizados en `tailwind.config.ts` y `globals.css`.
- Actualizar componentes base: `Button`, `Input`, `Select`, `Textarea`, `Badge`, `Alert`, `Table`, `Dialog`.
- Agregar variantes de boton `icon` y `destructive/secondary/ghost` refinadas.
- Crear `Tooltip` si no existe.
- Crear `PageContainer`, `PageHeader`, `Breadcrumbs`, `Toolbar`.
- Mantener cambios visuales compatibles con la UI actual.

Fase 2: Navegacion

- Marcar item activo en `AppSidebar`.
- Crear drawer mobile.
- Unificar labels de navegacion.
- Agregar breadcrumbs a paginas principales e hijas.

Fase 3: Pantallas operativas principales

- Migrar Dashboard, POS y Productos al nuevo sistema.
- En Productos, cambiar acciones repetidas a icon buttons con tooltip.
- En POS, mejorar layout responsive, foco visual del buscador y jerarquia del carrito.
- Validar con screenshots desktop/mobile.

Fase 4: Pantallas administrativas

- Migrar Ventas, Reportes, Importaciones y Ajustes.
- Mejorar tablas responsive.
- Estandarizar filtros y empty/error/loading states.

Fase 5: Pulido y control de calidad

- Revisar contrastes.
- Revisar navegacion por teclado.
- Revisar overflow en mobile.
- Agregar pruebas para componentes nuevos.
- Hacer screenshots de rutas clave.

## Que dejaria para futuro

- Tema oscuro. No lo haria ahora; primero conviene estabilizar tokens en light mode.
- Personalizacion por tienda/marca. Puede venir despues con tokens.
- Density switch compacto/comodo. Util para POS/tablas, pero no necesario al inicio.
- Atajos de teclado globales. Utiles para POS, pero requieren cuidado.
- Command palette. Interesante para usuarios avanzados, no prioridad.
- Animaciones. Solo microinteracciones discretas despues de resolver estructura.

## Riesgos

- Cambiar demasiadas pantallas de una vez puede introducir regresiones visuales.
- Si se centralizan tokens sin migrar componentes base, la app queda a medio camino.
- Icon buttons sin tooltip/aria-label empeoran usabilidad.
- Breadcrumbs generados automaticamente pueden mostrar labels malos para rutas dinamicas; conviene configurar labels por ruta.
- Mobile drawer necesita pruebas reales para evitar bloqueos de navegacion.

## Criterios de aceptacion

- Todas las paginas principales tienen breadcrumb.
- Sidebar marca pagina activa y rutas hijas.
- Mobile tiene navegacion usable.
- Componentes base consumen tokens semanticos.
- Botones y estados usan variantes consistentes.
- Tablas tienen acciones compactas y responsive definido.
- No hay clases de color hardcodeadas en nuevas pantallas salvo casos justificados.
- Se mantienen o agregan tests para componentes compartidos.
- `pnpm typecheck` pasa.
- Screenshots desktop/mobile de rutas clave no muestran overlap ni overflow.

## Recomendacion final

Implementaria primero la fundacion: tokens, PageHeader, Breadcrumbs, Button icon y sidebar activa. Despues migraria Productos y POS, porque son las pantallas donde mas se nota la mejora operativa. Luego Dashboard, Ventas, Reportes e Importaciones.

Este orden da valor rapido sin convertir el ajuste visual en una reescritura grande.
