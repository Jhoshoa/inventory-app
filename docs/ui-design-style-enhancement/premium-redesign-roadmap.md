# Roadmap de rediseno premium para web

Fecha: 2026-05-25

## Objetivo

Convertir la web en una aplicacion profesional, friendly y consistente para uso operativo diario, sin cambiar la logica de negocio ni reescribir el frontend desde cero.

El MVP actual ya es funcional. El objetivo de este roadmap no es corregir solo responsive o navegacion minima, sino elevar la percepcion de calidad del producto mediante un sistema visual coherente, mejores patrones de layout, componentes base mas refinados y migracion progresiva de pantallas criticas.

## Relacion con documentos previos

Documentos base:

- `docs/ui-design-style-enhancement/analisis-ajuste-ui.md`
- `docs/ui-design-style-enhancement/sprint-1-mvp-navigation-page-structure-plan.md`
- `docs/ui-design-style-enhancement/sprint-2-responsive-foundation-and-audit-plan.md`

Este documento no invalida el analisis inicial. Cambia la prioridad:

- Sprint 1 anterior era navegacion MVP. Ya esta mayormente implementado.
- Sprint 2 anterior era responsive foundation. Sigue siendo util, pero queda integrado dentro de un plan premium mas amplio.
- El nuevo foco empieza por design system y calidad visual antes de migrar pantallas una por una.

## Estado actual resumido

La web ya tiene una base suficiente para comenzar:

- Next.js App Router.
- Tailwind CSS 3.4 con `tailwind.config.ts`.
- Layout principal en `AppShell`.
- Sidebar desktop y drawer mobile.
- `PageHeader` inicial.
- Componentes UI compartidos: `Button`, `Input`, `Select`, `Table`, `Badge`, `Alert`, `Dialog`, `EmptyState`.
- Pantallas operativas funcionales: Dashboard, POS, Productos, Ventas, Reportes, Importaciones y Ajustes.

Actualizacion 2026-06-03:

- Sprint 1 esta parcialmente implementado: existen tokens semanticos, superficies base, `Tooltip`, `PageContainer`, `PageSection`, `ResponsiveActions` y `ResponsiveToolbar`.
- Sprint 2 esta parcialmente implementado: `AppShell`, `AppSidebar`, `AppHeader`, `MobileNavDrawer` y el contenedor principal ya usan parte de la fundacion premium.
- Sprint 3 esta completado funcionalmente: Dashboard, POS, Productos e Imprimir etiquetas ya usan la fundacion premium en sus rutas principales.
- Sprint 4 esta implementado: Ventas, Reportes, Movimientos, Cierres, Ajustes, rutas secundarias de Productos y componentes compartidos del alcance usan la fundacion premium.
- `PageHeader` ya soporta navegacion jerarquica via `Breadcrumbs`, y las rutas hijas prioritarias ya no dependen de botones manuales de regreso.
- El Dashboard incluye KPIs refinados, tabs de periodo funcionales, tasas disponibles, estado de jornada migrado y tests actualizados.
- La deuda principal para continuar es QA visual sistematico por viewport, accesibilidad final, contraste, focus states y limpieza de areas fuera del alcance premium actual.
- Todavia hay colores directos `slate-*`, `red-*`, `amber-*` y `emerald-*` en pantallas criticas y componentes compartidos; deben migrarse progresivamente a tokens semanticos.
- La funcionalidad actual de Importaciones/OCR queda excluida del rediseño premium por decision de producto. Mas adelante se planificara una importacion CSV con columnas especificas como funcionalidad separada.

Principales deudas para una experiencia premium:

- Colores directos `slate-*`, `red-*`, `amber-*`, `emerald-*` dispersos.
- Tokens semanticos incompletos.
- Componentes base funcionales pero aun simples.
- Tablas orientadas a desktop y con responsive limitado.
- Formularios y filtros con grids propios por pantalla.
- Breadcrumbs consistentes ya existen en rutas hijas prioritarias; queda extenderlos si aparecen nuevas rutas.
- Acciones repetidas de tabla usan texto donde convendrian icon buttons con tooltip.
- La funcionalidad actual de Importaciones/OCR queda fuera del rediseño premium por ahora; la futura importacion CSV se planificara aparte.
- No existe una validacion visual sistematica por viewport.

Deuda puntual detectada antes de Sprint 3:

- `PageHeader` aun no soporta breadcrumbs.
- `StoreDayStatusPanel` mantiene estilos antiguos aunque se renderiza dentro del Dashboard.
- POS conserva tarjetas y estados visuales con colores directos.
- Productos conserva filtros propios en vez de `ResponsiveToolbar`.
- La tabla de productos usa acciones de texto extensas y no aprovecha icon buttons con tooltip.
- Imprimir etiquetas tiene buena funcionalidad, pero la composicion visual y mobile siguen siendo de la etapa MVP.
- El empty state del Dashboard incluye copy temporal de sprint que debe corregirse.

Deuda actual despues de Sprint 4:

- Falta QA visual documentado por viewport; se mantiene como foco de Sprint 5.
- Auth, Importaciones/OCR y algunos estados globales no forman parte del alcance premium ya implementado.
- La funcionalidad futura de importacion CSV necesita un sprint propio con columnas esperadas, validaciones, preview y manejo de errores.
- Queda revisar contraste, focus rings, navegacion por teclado, dialogs y tooltips con una pasada de accesibilidad dedicada.
- Queda validar con datos extremos: nombres largos, tablas densas, montos grandes y estados vacios.

## Principios de diseno

1. La app debe sentirse como herramienta de trabajo premium, no como landing page.
2. La claridad operativa pesa mas que la decoracion.
3. La UI debe ser friendly sin perder densidad: lectura rapida, acciones claras, bajo ruido.
4. El sistema visual debe centralizar decisiones: color, spacing, focus, estados, superficies y acciones.
5. El color debe comunicar jerarquia y estado, no dominar toda la interfaz.
6. Las pantallas criticas deben priorizar tareas frecuentes: vender, buscar productos, revisar stock, filtrar reportes.
7. Mobile debe ser usable, no solo una version apilada del desktop.
8. Cada cambio visual debe preservar permisos, datos, acciones y rutas existentes.

## Direccion visual propuesta

Personalidad:

- Profesional.
- Amigable.
- Clara.
- Operativa.
- Moderna sin ser decorativa.

Paleta recomendada:

- Fondo app: neutral frio muy claro.
- Superficie principal: blanco.
- Superficie secundaria: gris frio muy bajo.
- Texto fuerte: casi negro neutral.
- Texto body: gris oscuro.
- Texto muted: gris medio.
- Brand: azul profundo o teal profesional, usado con moderacion.
- Success: emerald.
- Warning: amber.
- Danger: red.
- Info: sky/blue.

Evitar:

- UI dominada por morados o gradientes.
- Paletas de un solo tono.
- Tarjetas decorativas innecesarias.
- Secciones tipo landing page.
- Sombras pesadas.
- Animaciones que distraigan del trabajo.

## Decision sobre skills Tailwind

No instalar skills nuevos al inicio.

Razon:

- El proyecto usa Tailwind CSS 3.4 y configuracion en `tailwind.config.ts`.
- Los skills revisados estan mas orientados a Tailwind v4, CSS-first config o frameworks especificos.
- El mayor riesgo actual no es falta de snippets Tailwind, sino falta de sistema visual propio.
- Ya existen skills locales suficientes para guiar Next.js y React:
  - `next-best-practices`
  - `vercel-react-best-practices`

Se puede reevaluar despues del Sprint 1 si aparece una necesidad concreta.

## Roadmap por sprints

### Sprint 1: Design system premium

Objetivo:

Crear la base visual premium antes de migrar pantallas. Este sprint define el idioma visual de toda la app.

Alcance:

- Definir tokens semanticos en `tailwind.config.ts` y `globals.css`.
- Refinar componentes UI base:
  - `Button`
  - `Input`
  - `Select`
  - `Textarea`
  - `Badge`
  - `Alert`
  - `Table`
  - `Dialog`
  - `EmptyState`
- Agregar variantes necesarias:
  - button `primary`, `secondary`, `ghost`, `danger`, `icon`
  - badge `default`, `success`, `warning`, `danger`, `info`
  - alert `info`, `success`, `warning`, `error`
- Crear o ajustar:
  - `Tooltip`
  - `PageContainer`
  - `PageSection`
  - `ResponsiveActions`
  - `ResponsiveToolbar`
- Mantener compatibilidad con los usos actuales.

Fuera de alcance:

- Migrar todas las pantallas.
- Rehacer tablas como cards mobile.
- Cambiar logica de negocio.
- Agregar librerias UI pesadas.

Archivos probables:

```text
apps/web/tailwind.config.ts
apps/web/app/globals.css
apps/web/src/components/ui/*
apps/web/src/components/layout/PageContainer.tsx
apps/web/src/components/layout/PageSection.tsx
apps/web/src/components/layout/ResponsiveActions.tsx
apps/web/src/components/layout/ResponsiveToolbar.tsx
apps/web/src/components/ui/Tooltip.tsx
```

Criterios de aceptacion:

- Los componentes base usan tokens semanticos.
- Los estilos nuevos no dependen de colores hardcodeados salvo excepciones justificadas.
- `pnpm typecheck`, `pnpm lint` y tests relevantes pasan.
- Los componentes existentes no pierden comportamiento.

### Sprint 2: Layout, navegacion y estructura de pagina

Objetivo:

Hacer que la estructura global se sienta premium y consistente.

Alcance:

- Refinar `AppShell`, `AppHeader`, `AppSidebar` y `MobileNavDrawer`.
- Integrar `PageContainer` en el layout principal.
- Evolucionar `PageHeader` para soportar breadcrumbs.
- Crear configuracion de breadcrumbs por ruta.
- Normalizar acciones de header y toolbars.
- Eliminar labels inconsistentes de navegacion.
- Mejorar responsive del shell y header.

Fuera de alcance:

- Redisenar cada pantalla interna.
- Convertir todas las tablas a mobile cards.

Criterios de aceptacion:

- Todas las rutas principales tienen estructura de pagina consistente.
- Breadcrumbs existen al menos en rutas principales y rutas hijas criticas.
- Sidebar y drawer usan los mismos tokens y estados activos.
- No hay regresiones de accesibilidad en drawer o navegacion.

### Sprint 3: Pantallas operativas criticas

Objetivo:

Redisenar las pantallas que mas impactan la percepcion y uso diario.

Documento de ejecucion:

- `docs/ui-design-style-enhancement/sprint-3-critical-operational-screens-implementation.md`

Estado actualizado:

- Dashboard: completado para el alcance del sprint.
- POS: completado para el alcance del sprint.
- Productos: completado para listado/filtros/tabla del sprint.
- Imprimir etiquetas: completado para el alcance del sprint.

Orden recomendado:

1. Dashboard.
2. POS.
3. Productos.
4. Imprimir etiquetas.

Alcance por pantalla:

Dashboard:

- KPIs mas refinados.
- Mejor jerarquia entre resumen, jornada, ventas recientes y stock bajo.
- Tablas contenidas y legibles.

POS:

- Busqueda/escaneo con foco visual claro.
- Carrito mas legible y estable.
- Layout desktop operativo y mobile usable.
- Acciones de checkout claras.

Productos:

- Filtros en `ResponsiveToolbar`.
- Tabla con acciones compactas.
- Stock y estado con badges consistentes.
- Mejor lectura de SKU/codigo/categoria.

Etiquetas:

- Configuracion de impresion mas clara.
- Paneles de resultados/seleccionados mas balanceados.
- Preview contenido sin romper mobile.

Criterios de aceptacion:

- Las rutas criticas se ven profesionales en mobile, tablet y desktop.
- No hay overflow horizontal del documento.
- Acciones principales son visibles y faciles de usar.
- Se mantiene la funcionalidad existente.

### Sprint 4: Administracion, reportes y tablas avanzadas

Objetivo:

Llevar el mismo nivel visual al resto de pantallas administrativas y reemplazar botones manuales de regreso por navegacion jerarquica reusable.

Documento de ejecucion:

- `docs/ui-design-style-enhancement/sprint-4-admin-reports-advanced-tables-implementation.md`

Estado actualizado:

- Implementado el 2026-06-03.
- Verificado con `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint` y `corepack pnpm build`.
- Importaciones/OCR se mantiene fuera de alcance; la futura importacion CSV queda para planificacion separada.

Alcance:

- Navegacion jerarquica reusable integrada con `PageHeader`.
- Ventas.
- Detalle de venta.
- Reportes.
- Movimientos de stock.
- Cierres diarios.
- Movimientos de caja.
- Ajustes.
- Permisos y categorias.
- Rutas secundarias de Productos.

Mejoras esperadas:

- Breadcrumbs/navegacion jerarquica responsive en rutas hijas.
- Tablas con overflow controlado.
- Columnas prioritarias.
- Acciones compactas con iconos y tooltip donde aplique.
- Filtros consistentes.
- Empty/loading/error states unificados.
- Textos en espanol consistentes.

Criterios de aceptacion:

- Todas las pantallas administrativas usan la fundacion visual.
- Las rutas hijas muestran jerarquia de navegacion clara y reutilizable.
- Las tablas no rompen mobile.
- Las acciones destructivas y restringidas son claras.
- Los permisos siguen respetandose.
- Cada bloque incluye tests de verificacion relevantes.

### Sprint 5: Pulido, accesibilidad y QA visual

Objetivo:

Cerrar la calidad visual con validacion real.

Documento de ejecucion:

- `docs/ui-design-style-enhancement/sprint-5-premium-polish-accessibility-qa-implementation.md`

Estado actualizado:

- Implementado para el alcance inicial el 2026-06-03.
- Auth, layout global, global error y overlay mobile fueron migrados a tokens premium.
- Verificado con `corepack pnpm test`, `corepack pnpm typecheck`, `corepack pnpm lint` y `corepack pnpm build`.
- Importaciones/OCR se mantiene fuera de alcance.
- Queda pendiente QA visual con screenshots por viewport como cierre final.

Alcance:

- Auditoria responsive por viewport.
- Screenshots con Playwright o validacion manual documentada.
- Revision de contraste.
- Revision de navegacion por teclado.
- Revision de focus rings.
- Revision de dialogs y tooltips.
- Revision de textos largos y datos extremos.
- Ajustes de loading, empty y error states.

Viewports minimos:

```text
375 x 812
430 x 932
768 x 1024
1024 x 768
1440 x 900
```

Rutas minimas:

```text
/dashboard
/dashboard/pos
/dashboard/products
/dashboard/products/labels
/dashboard/sales
/dashboard/reports
/dashboard/settings
```

Criterios de aceptacion:

- Sin solapes visuales.
- Sin overflow horizontal de documento.
- Navegacion mobile funcional.
- Focus visible en controles interactivos.
- Dialogs accesibles.
- Tooltips accesibles en acciones de icono.
- `pnpm typecheck`, `pnpm lint` y tests relevantes pasan.

## Orden recomendado de trabajo

1. Crear rama dedicada:

```bash
git switch -c feat/web-premium-redesign
```

2. Implementar Sprint 1 en commits pequenos:

```text
feat(web): add premium design tokens
feat(web): refine base ui components
feat(web): add responsive layout primitives
feat(web): add accessible tooltip
```

3. Validar que la app sigue funcionando.
4. Migrar estructura global en Sprint 2.
5. Migrar pantallas criticas en Sprint 3.
6. Migrar pantallas administrativas en Sprint 4.
7. Hacer QA visual en Sprint 5.

## Riesgos

- Cambiar estilos globales puede afectar muchas pantallas a la vez.
- Tokens mal definidos pueden dejar la app inconsistente.
- Redisenar pantallas antes del sistema visual puede duplicar trabajo.
- Tablas con acciones de icono sin tooltip empeoran accesibilidad.
- Migrar demasiadas rutas en un solo commit dificulta revisar regresiones.

## Mitigaciones

- Empezar por componentes base con compatibilidad hacia atras.
- Mantener commits pequenos.
- No cambiar contratos de props salvo necesidad real.
- Validar despues de cada sprint con typecheck, lint y tests.
- Usar screenshots en rutas clave antes de cerrar el rediseño.

## Definicion de listo para comenzar

Se puede comenzar Sprint 1 cuando:

- Este roadmap este aprobado.
- Se acepte no instalar skills Tailwind adicionales por ahora.
- Se trabaje en una rama dedicada.
- Se mantenga la logica de negocio fuera del alcance.
- Se priorice consistencia del sistema visual sobre cambios aislados por pantalla.

## Recomendacion final

Comenzar ahora es razonable, pero no saltando directo a pantallas individuales. El primer paso debe ser Sprint 1: design system premium. Despues de eso, la migracion por pantallas sera mas rapida, consistente y facil de revisar.
