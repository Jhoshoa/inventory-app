# Sprint 2: Fundacion Responsive y Auditoria de Pantallas

Fecha: 2026-05-23

## Objetivo

Corregir la deuda responsive de la web sin tocar logica de negocio ni convertir el ajuste visual en una reescritura grande.

Sprint 1 dejo una base minima:

- `MobileNavDrawer`;
- sidebar con ruta activa;
- `PageHeader`;
- migracion inicial de Productos, Etiquetas, Reportes y Ajustes.

Sprint 2 debe estabilizar la experiencia responsive real de las pantallas principales. El problema actual no es Tailwind en si: la app usa Tailwind, pero cada pantalla arma sus propios `grid`, `flex`, `min-width`, tablas y toolbars. Sin componentes base de layout responsive, mobile se rompe aunque se usen clases Tailwind.

## Rama Recomendada

Crear una rama dedicada antes de implementar:

```bash
git switch -c feat/ui-responsive-foundation
```

Razon:

- El cambio visual toca muchas pantallas.
- Debe poder revisarse con screenshots y pruebas sin bloquear fixes funcionales del MVP.
- Permite hacer commits pequenos por componente/pantalla.

## Documentos Base

- `docs/ui-design-style-enhancement/analisis-ajuste-ui.md`
- `docs/ui-design-style-enhancement/sprint-1-mvp-navigation-page-structure-plan.md`

## Skills Aplicados

- `next-best-practices`: mantener rutas y layouts como Server Components cuando no requieran interactividad, evitar mover data fetching a cliente, y usar Client Components solo para controles interactivos.
- `vercel-react-best-practices`: reducir re-render innecesario, estabilizar estructuras compartidas, no crear componentes inline pesados y mantener imports de iconos/librerias acotados.

## Estado Actual Verificado

### Ya Existe

Layout/navegacion:

```text
apps/web/src/components/layout/AppShell.tsx
apps/web/src/components/layout/AppHeader.tsx
apps/web/src/components/layout/AppSidebar.tsx
apps/web/src/components/layout/MobileNavDrawer.tsx
apps/web/src/components/layout/PageHeader.tsx
apps/web/src/components/layout/navigation.ts
```

UI base:

```text
apps/web/src/components/ui/Button.tsx
apps/web/src/components/ui/Input.tsx
apps/web/src/components/ui/Select.tsx
apps/web/src/components/ui/Table.tsx
apps/web/src/components/ui/Alert.tsx
apps/web/src/components/ui/Badge.tsx
apps/web/src/components/ui/EmptyState.tsx
apps/web/src/components/ui/CollapsibleSection.tsx
```

Pantallas principales:

```text
/dashboard
/dashboard/pos
/dashboard/products
/dashboard/products/new
/dashboard/products/labels
/dashboard/sales
/dashboard/reports
/dashboard/reports/stock-movements
/dashboard/reports/store-days
/dashboard/reports/cash-movements
/dashboard/imports
/dashboard/imports/[importId]
/dashboard/settings
```

### Problemas Actuales

- `AppShell` da padding general, pero no hay `PageContainer`/`PageSection` para normalizar layout.
- `PageHeader` existe, pero aun no esta aplicado a todas las rutas.
- Muchas toolbars/filtros usan grids particulares.
- Las tablas se renderizan como tablas desktop con overflow poco controlado.
- Algunas acciones se solapan o quedan incomodas en mobile.
- Algunos paneles tienen ancho minimo implicito por botones o columnas.
- Hay paginas con headers antiguos o textos en ingles como `Import Image`.
- No hay checklist visual por viewport.
- No hay prueba automatizada de overflow/mobile.

## Decision Principal

Sprint 2 debe enfocarse en fundacion responsive compartida antes de retocar pantalla por pantalla.

No conviene empezar cambiando cada componente de forma aislada. Primero hay que crear patrones reutilizables:

- `PageContainer`;
- `PageSection`;
- `ResponsiveToolbar`;
- `ResponsiveActions`;
- mejoras a `Table` para overflow controlado;
- utilidades de layout para formularios y paneles.

Despues se migran las pantallas criticas.

## Alcance Sprint 2

### 1. Auditoria Responsive Inicial

Crear una lista de hallazgos por ruta y viewport.

Viewports minimos:

```text
375 x 812   mobile pequeno
430 x 932   mobile grande
768 x 1024  tablet
1024 x 768  tablet landscape
1440 x 900  desktop
```

Rutas a revisar:

```text
/dashboard
/dashboard/pos
/dashboard/products
/dashboard/products/new
/dashboard/products/labels
/dashboard/sales
/dashboard/reports
/dashboard/reports/stock-movements
/dashboard/reports/store-days
/dashboard/reports/cash-movements
/dashboard/imports
/dashboard/settings
```

Registrar por ruta:

- overflow horizontal;
- elementos solapados;
- botones fuera de pantalla;
- tablas ilegibles;
- filtros que se rompen;
- texto truncado incorrectamente;
- acciones primarias poco accesibles;
- drawer/header interactuando mal con contenido.

Documento sugerido:

```text
docs/ui-design-style-enhancement/sprint-2-responsive-audit.md
```

### 2. Componentes de Layout Responsive

Crear o ajustar:

```text
apps/web/src/components/layout/PageContainer.tsx
apps/web/src/components/layout/PageSection.tsx
apps/web/src/components/layout/ResponsiveToolbar.tsx
apps/web/src/components/layout/ResponsiveActions.tsx
```

#### PageContainer

Responsabilidad:

- ancho maximo;
- padding responsive;
- spacing vertical base;
- evitar que cada pagina decida `mx-auto max-w-7xl px-4 py-6`.

API sugerida:

```tsx
<PageContainer>
  ...
</PageContainer>
```

Reglas:

- mobile: `px-4 py-4`;
- tablet: `sm:px-6 sm:py-5`;
- desktop: `lg:px-8 lg:py-6`;
- max width: mantener `max-w-7xl` por ahora.

#### PageSection

Responsabilidad:

- separar bloques sin tarjetas anidadas;
- estandarizar `space-y-*`;
- permitir `print-hidden` cuando aplique.

API sugerida:

```tsx
<PageSection>
  ...
</PageSection>
```

#### ResponsiveToolbar

Responsabilidad:

- contener busquedas, filtros y acciones;
- mobile en una columna;
- desktop en filas/grids estables;
- evitar que selects y botones se solapen.

API sugerida:

```tsx
<ResponsiveToolbar>
  ...
</ResponsiveToolbar>
```

Reglas:

- inputs/selects `w-full`;
- acciones agrupadas al final;
- `gap-3`;
- no usar anchos fijos salvo casos justificados.

#### ResponsiveActions

Responsabilidad:

- agrupar botones del header o toolbars;
- mobile: wrap o columna segun contexto;
- desktop: alineado a la derecha.

### 3. Tabla Responsive MVP

Modificar:

```text
apps/web/src/components/ui/Table.tsx
```

Objetivo Sprint 2:

- No convertir todas las tablas a cards todavia.
- Si una tabla no cabe, debe tener scroll horizontal controlado dentro de su panel, no romper el viewport.
- Header/celdas deben tener whitespace y min-width razonables.

Requisitos:

- Wrapper con `overflow-x-auto`.
- `min-w-full`.
- `text-sm`.
- celdas con `whitespace-nowrap` solo donde corresponde, no global si rompe contenido.
- permitir `className` para columnas con texto largo.

Despues de esto, cada tabla puede mejorar en Sprint 3 con modo card mobile si hace falta.

### 4. Migracion de Pantallas Criticas

Orden recomendado:

1. `AppShell` y layout global.
2. Dashboard.
3. POS.
4. Productos.
5. Imprimir etiquetas.
6. Reportes.
7. Ventas.
8. Importaciones.
9. Ajustes.

Para Sprint 2, el alcance minimo debe cubrir:

```text
/dashboard
/dashboard/pos
/dashboard/products
/dashboard/products/labels
/dashboard/reports
```

Si el tiempo alcanza:

```text
/dashboard/sales
/dashboard/imports
/dashboard/settings
```

### 5. Dashboard

Problemas esperados:

- cards KPI apiladas pero con espaciado irregular;
- tablas de ultimas ventas/stock pueden desbordar;
- header interno propio en `DashboardOverview`.

Cambios recomendados:

- usar `PageHeader` o conservar header especifico solo si tiene tabs operativos;
- usar `PageSection`;
- tablas con wrapper responsive;
- KPI grid:

```text
grid-cols-1
sm:grid-cols-2
xl:grid-cols-4
```

No cambiar la logica de resumen ni scopes.

### 6. POS

Pantalla critica para MVP.

Objetivo:

- que busqueda/escaneo y carrito sean usables en mobile;
- no perder foco operativo en desktop.

Cambios esperados:

- layout mobile en una columna;
- carrito debajo o panel propio;
- botones de cantidad estables;
- evitar grids con columnas minimas grandes;
- mantener input de busqueda visible y ancho completo.

No agregar scanner de camara.

### 7. Productos

Objetivo:

- toolbar de busqueda/filtros no debe romper mobile;
- tabla debe tener overflow controlado;
- acciones deben seguir accesibles.

Cambios esperados:

- migrar filtros a `ResponsiveToolbar`;
- mantener `ProductBrowser` funcional;
- no cambiar endpoints ni busqueda.

### 8. Imprimir Etiquetas

Objetivo:

- controles de hoja/etiqueta/datos visibles deben ser usables en mobile;
- resultados y seleccionados no deben solaparse;
- preview puede tener overflow horizontal controlado porque usa medidas fisicas.

Cambios esperados:

- toolbar superior con `ResponsiveToolbar`;
- panel de configuracion en una columna mobile;
- resultados/seleccionados apilados en mobile;
- mantener CSS print intacto.

### 9. Reportes

Objetivo:

- filtros de fecha no deben desbordar;
- export panel debe apilar acciones;
- tablas/graficos deben conservar lectura.

Cambios esperados:

- `DateRangeFilter` con toolbar responsive;
- export actions wrap correcto;
- tablas con overflow controlado.

## Fuera de Alcance

- Redisenar paleta completa.
- Tokens semanticos globales.
- Tema oscuro.
- Rehacer todas las tablas como cards mobile.
- Icon buttons con tooltips para todas las tablas.
- Breadcrumbs completos.
- Cambios backend.
- Cambios de comportamiento de negocio.
- Nuevas dependencias UI.
- Scanner de camara.
- Redisenar POS desde cero.

## Archivos Probables

Crear:

```text
apps/web/src/components/layout/PageContainer.tsx
apps/web/src/components/layout/PageSection.tsx
apps/web/src/components/layout/ResponsiveToolbar.tsx
apps/web/src/components/layout/ResponsiveActions.tsx
docs/ui-design-style-enhancement/sprint-2-responsive-audit.md
```

Modificar:

```text
apps/web/src/components/layout/AppShell.tsx
apps/web/src/components/layout/PageHeader.tsx
apps/web/src/components/ui/Table.tsx
apps/web/src/features/dashboard/components/DashboardOverview.tsx
apps/web/src/features/pos/components/*
apps/web/src/features/products/components/ProductBrowser.tsx
apps/web/src/features/products/components/ProductFilters.tsx
apps/web/src/features/products/components/ProductTable.tsx
apps/web/src/features/products/components/ProductLabelPage.tsx
apps/web/src/features/reports/components/DateRangeFilter.tsx
apps/web/src/features/reports/components/ExportPanel.tsx
apps/web/app/(app)/dashboard/*.tsx
```

Nota:

- Ajustar archivos exactos despues de auditoria.
- No tocar backend.

## Testing Requerido

### Unit / Component

Agregar o actualizar:

- `PageContainer` renderiza contenido y clases base.
- `ResponsiveToolbar` no rompe children.
- `Table` mantiene estructura semantica y wrapper overflow.
- `DateRangeFilter` mantiene comportamiento de URL.
- `ProductFilters` mantiene callbacks.
- `ProductLabelPage` mantiene busqueda, seleccion, imprimir y SVG.

### E2E / Visual Manual

Usar Playwright o validacion manual con screenshots.

Rutas minimas:

```text
/dashboard
/dashboard/pos
/dashboard/products
/dashboard/products/labels
/dashboard/reports
```

Viewports minimos:

```text
375x812
430x932
768x1024
1440x900
```

Validar:

- sin overflow horizontal del documento;
- drawer no se mezcla con contenido;
- header no tapa controles;
- acciones principales visibles;
- filtros usables;
- tablas contenidas;
- botones no se solapan;
- textos no salen de cards/paneles.

## Criterios de Aceptacion

Sprint 2 se considera completo cuando:

- Existe auditoria responsive documentada.
- `AppShell` usa una estructura de container consistente.
- Existen componentes base responsive para container, sections, toolbar y actions.
- Las rutas criticas se ven y se usan correctamente en mobile y desktop.
- Las tablas no rompen el ancho del viewport.
- POS es usable en mobile para buscar/agregar productos y ver carrito.
- Productos es usable en mobile para buscar/filtrar/ver acciones.
- Etiquetas es usable en mobile para buscar/agregar/configurar/imprimir.
- Reportes es usable en mobile para filtrar y exportar.
- No se introducen cambios backend.
- No se agregan dependencias nuevas.
- `pnpm typecheck` pasa.
- `pnpm lint` pasa.
- Tests relevantes pasan.

## Checklist Manual

### Mobile 375x812

- Abrir drawer y navegar.
- Dashboard no tiene overflow horizontal.
- POS permite escribir en buscador.
- POS muestra carrito sin ocultar acciones.
- Productos permite buscar y filtrar.
- Etiquetas permite buscar/agregar producto.
- Reportes permite cambiar rango.

### Mobile 430x932

- Validar mismas rutas con un ancho mobile comun.
- Verificar botones largos.
- Verificar tarjetas con datos largos.

### Tablet 768x1024

- Sidebar sigue oculta si corresponde al breakpoint actual.
- Drawer se comporta correctamente.
- Grids de 2 columnas no solapan contenido.

### Desktop 1440x900

- Sidebar desktop activa.
- Layout conserva densidad operativa.
- No se ve excesivamente espaciado por cambios mobile.

## Riesgos y Mitigaciones

### Riesgo: cambiar demasiadas pantallas a la vez

Mitigacion:

- Trabajar en rama dedicada.
- Commits pequenos:
  1. componentes base;
  2. tablas;
  3. dashboard/productos;
  4. POS;
  5. reportes/etiquetas.

### Riesgo: romper logica funcional

Mitigacion:

- No tocar acciones, endpoints ni DTOs.
- Mantener props existentes.
- Tests por pantalla antes y despues.

### Riesgo: usar Tailwind sin sistema

Mitigacion:

- Centralizar patrones en componentes layout.
- Evitar repetir grids complejos por pantalla.

### Riesgo: tablas siguen poco usables en mobile

Mitigacion:

- Sprint 2 garantiza contencion y scroll controlado.
- Sprint 3 puede convertir tablas prioritarias a cards mobile.

### Riesgo: screenshots manuales consumen tiempo

Mitigacion:

- Priorizar rutas MVP.
- Documentar hallazgos de rutas no criticas para Sprint 3.

## Orden Recomendado de Implementacion

1. Crear rama `feat/ui-responsive-foundation`.
2. Hacer auditoria responsive inicial y crear `sprint-2-responsive-audit.md`.
3. Crear `PageContainer`, `PageSection`, `ResponsiveToolbar`, `ResponsiveActions`.
4. Ajustar `AppShell` para usar container/layout consistente.
5. Ajustar `Table` con overflow controlado.
6. Migrar Dashboard.
7. Migrar Productos y ProductFilters.
8. Migrar POS.
9. Migrar Etiquetas.
10. Migrar Reportes.
11. Ejecutar tests y typecheck/lint.
12. Hacer validacion manual por viewport.
13. Documentar pendientes para Sprint 3.

## Recomendacion Final

Sprint 2 debe resolver la base responsive de la app, no el rediseño completo.

Despues de Sprint 2, la app debe ser usable en mobile/tablet/desktop sin solapes ni overflow grave. El siguiente sprint puede enfocarse en la mejora visual real: tokens, paleta, botones, tablas tipo card, tooltips, breadcrumbs y migracion estetica profunda de pantallas.
