# Sprint 1 premium: design system foundation

Fecha: 2026-05-27

## Objetivo

Implementar la primera base del rediseño premium sin cambiar logica de negocio ni migrar pantallas completas. Esta fase debe mejorar el lenguaje visual compartido para que las siguientes paginas se rediseñen con componentes consistentes y no con clases sueltas por pantalla.

## Alcance implementado en esta fase

- Tokens semanticos de color en Tailwind y CSS variables.
- Estilos globales base para fondo, texto, seleccion y focus.
- Refinamiento compatible de componentes UI base:
  - `Button`
  - `Input`
  - `Select`
  - `Textarea`
  - `Badge`
  - `Alert`
  - `Table`
  - `Dialog`
  - `EmptyState`
- Nuevas primitivas compartidas:
  - `PageContainer`
  - `PageSection`
  - `ResponsiveActions`
  - `ResponsiveToolbar`
  - `Tooltip`
- Ajuste de `AppShell` para consumir `PageContainer`.

## Principios aplicados

- Mantener compatibilidad con usos actuales.
- Evitar dependencias nuevas.
- Usar tokens semanticos para estilos nuevos.
- Conservar densidad operativa: superficies claras, bordes sutiles, acciones legibles.
- Dejar migracion profunda de paginas para las siguientes fases.

## Fuera de alcance

- Breadcrumbs completos.
- Rediseño de Dashboard, POS, Productos, Ventas o Reportes.
- Conversion de tablas a cards mobile.
- Cambios backend o de permisos.
- Tema oscuro.
- Nueva libreria de componentes.

## Criterios de aceptacion

- `pnpm typecheck` pasa.
- Tests relevantes de componentes/layout pasan.
- Los componentes existentes conservan sus props actuales.
- Las tablas quedan contenidas con overflow horizontal controlado.
- Las acciones icon-only pueden usar tooltip accesible.
- La app usa fondo y superficies desde tokens semanticos.

## Pendientes para la siguiente fase

- Migrar el shell visual completo: header, sidebar y drawer.
- Agregar breadcrumbs en `PageHeader`.
- Migrar pantallas criticas empezando por Dashboard, POS y Productos.
- Reemplazar acciones repetitivas de tablas por icon buttons con tooltip donde aplique.
- Ejecutar QA visual por viewports con Playwright.
