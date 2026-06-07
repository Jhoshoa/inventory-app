# Sprint 1: QA visual y baseline de screenshots

Fecha: 2026-06-07

## Objetivo

Crear una linea base visual verificable para las rutas principales del MVP 1, con evidencia por viewport y checks automatizados contra regresiones visibles. Este sprint no cambia logica de negocio; solo permite detectar y corregir issues pequenos de UI que afecten uso diario.

## Alcance

- Capturar screenshots de rutas principales en mobile, tablet y desktop.
- Validar que el documento no tenga overflow horizontal accidental.
- Validar que elementos interactivos visibles no queden fuera del viewport.
- Revisar evidencia generada y registrar hallazgos por ruta.
- Corregir solo problemas pequenos encontrados durante la revision.

## Rutas incluidas

- `/dashboard`
- `/dashboard/pos`
- `/dashboard/products`
- `/dashboard/products/labels`
- `/dashboard/sales`
- `/dashboard/reports`
- `/dashboard/settings`

## Viewports incluidos

- `375 x 812`
- `430 x 932`
- `768 x 1024`
- `1024 x 768`
- `1440 x 900`

## Entregables

- Spec Playwright de QA visual: `apps/web/e2e/visual-baseline.spec.ts`.
- Screenshots generados como artefactos en `apps/web/test-results/visual-baseline/`.
- Reporte de ejecucion y hallazgos: `docs/last-features-for-mvp-1/sprint-1-qa-visual-report.md`.

## Criterios de aceptacion

- Las rutas principales renderizan sin crash autenticado.
- Cada ruta tiene evidencia visual por viewport.
- No existe overflow horizontal del documento en las rutas revisadas.
- Los controles visibles quedan dentro del viewport.
- Los hallazgos restantes quedan documentados para sprints posteriores.

## Plan tecnico

1. Agregar un spec e2e dedicado para baseline visual.
2. Reutilizar la sesion autenticada existente de Playwright.
3. Generar nombres de screenshot estables por viewport y ruta.
4. Ejecutar checks DOM conservadores para evitar falsos positivos:
   - `documentElement.scrollWidth` no debe exceder `clientWidth`.
   - `body.scrollWidth` no debe exceder `clientWidth`.
   - controles visibles no deben salir del viewport horizontal.
5. Ejecutar la suite de validacion frontend.
6. Documentar resultados y riesgos restantes.

## Validacion requerida

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

## Fuera de alcance

- Redisenar tablas, POS o settings.
- Cambiar contratos de API o persistencia.
- Agregar features nuevas.
- Reintroducir Importaciones por foto/OCR.
