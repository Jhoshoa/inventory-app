# Sprint 1 QA visual report

Fecha: 2026-06-07

## Resultado

Sprint 1 completado para las rutas principales del MVP 1. Se agrego baseline visual automatizado con Playwright, evidencia por viewport y validaciones contra overflow horizontal del documento.

## Evidencia generada

Directorio:

```text
docs/last-features-for-mvp-1/sprint-1-screenshots/
```

Total de screenshots generados: 35.

Cobertura:

- 7 rutas principales.
- 5 viewports por ruta.
- Sesion autenticada de prueba con rol owner.

## Checks automatizados

El spec `apps/web/e2e/visual-baseline.spec.ts` valida por cada ruta y viewport:

- la ruta renderiza dentro de `main`;
- no aparece crash de aplicacion;
- `documentElement.scrollWidth` no excede el ancho visible;
- `body.scrollWidth` no excede el ancho visible;
- controles visibles no quedan fuera del viewport horizontal;
- se captura screenshot full-page estable.

## Correcciones aplicadas

- Dashboard mobile `375 x 812`:
  - Se agrego `min-w-0` a los contenedores de paneles con tablas.
  - El encabezado de seccion ahora apila acciones en mobile y vuelve a layout horizontal desde `sm`.
  - Resultado: las tablas mantienen scroll interno y ya no ensanchan el documento.

- Etiquetas de productos `1024 x 768`:
  - La toolbar de filtros/acciones conserva flex-wrap hasta `xl`.
  - El grid rigido de acciones se activa solo cuando hay ancho suficiente.
  - Resultado: el boton de exportacion SVG ya no queda fuera del viewport.

## Validacion ejecutada

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

Resultado:

- Typecheck: OK.
- Lint: OK.
- Unit tests: OK, 42 archivos y 132 tests.
- Build: OK.
- E2E: OK, 48 tests.
- Visual baseline: OK, 35 screenshots.

## Hallazgos para sprints posteriores

- Las tablas siguen siendo scrollables en mobile; Sprint 6 debe decidir cuales conviene convertir a cards operativas.
- POS y tablas ya pasan baseline visual, pero el refinamiento de uso intensivo queda para Sprint 2 y Sprint 3.
- El baseline actual usa sesion Playwright y estados fallback cuando no hay backend real con datos sembrados. Para Sprint 9 conviene repetir QA con datos extremos y fixtures realistas.
