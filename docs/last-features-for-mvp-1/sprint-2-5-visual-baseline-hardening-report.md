# Sprint 2.5 implementation report: Visual baseline hardening

Fecha: 2026-06-07

## Resultado

Sprint 2.5 completado. El baseline visual ahora usa un mock backend local con fixtures realistas, genera screenshots fuera de `docs` y valida que no aparezcan banners `fetch failed` en las rutas principales.

## Cambios implementados

- Se agrego `apps/web/e2e/visual-fixtures.ts`.
- El spec `apps/web/e2e/visual-baseline.spec.ts` ahora:
  - levanta un mock backend HTTP en `localhost:8001`;
  - sirve respuestas para endpoints principales de `/api/v1/*`;
  - captura screenshots en `apps/web/test-results/visual-baseline/`;
  - valida ausencia de `Application error`;
  - valida ausencia de `fetch failed`;
  - conserva checks de overflow horizontal del documento;
  - ignora controles dentro de contenedores con scroll horizontal controlado.

## Fixtures cubiertos

- Dashboard con ventas, stock bajo, sin stock y tasas.
- POS con jornada abierta.
- Productos con inventario disponible, stock bajo y sin stock.
- Etiquetas con categorias y busqueda lista para usar.
- Ventas completadas y anuladas.
- Reportes con metodos de pago y productos destacados.
- Settings con jornada abierta, eventos, categorias y movimientos de caja.

## Correcciones adicionales encontradas por los fixtures

- `ProductFilters` ahora conserva layout flexible hasta `xl`; el grid rigido ya no entra demasiado pronto.
- `PaymentMethodBreakdown` y `TopProductsTable` usan `min-w-0` para evitar overflow de documento en mobile.
- `ProductCategorySettings` fue migrado al primitive compartido `Table`, con scroll horizontal controlado y acciones consistentes.

## Evidencia

Los screenshots se generan en:

```text
apps/web/test-results/visual-baseline/
```

Ese directorio esta ignorado por git como artefacto de prueba.

## Validacion ejecutada

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
corepack pnpm exec playwright test e2e/visual-baseline.spec.ts
```

Resultado:

- Typecheck: OK.
- Lint: OK.
- Unit tests: OK, 42 archivos y 133 tests.
- Build: OK.
- E2E: OK, 48 tests.
- Visual baseline enfocado: OK, 35 tests.
