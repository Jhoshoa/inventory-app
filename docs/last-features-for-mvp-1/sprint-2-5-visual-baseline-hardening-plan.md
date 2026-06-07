# Sprint 2.5: Visual baseline hardening

Fecha: 2026-06-07

## Objetivo

Convertir el baseline visual inicial en evidencia profesional y repetible, usando datos mockeados estables en lugar de capturar pantallas contaminadas por estados `fetch failed`.

## Problema actual

El baseline visual de Sprint 1 valida rutas y overflow, pero levanta solo el frontend. Como varias rutas hacen `fetch` server-side contra el backend FastAPI, los screenshots pueden mostrar banners rojos de error cuando el backend no esta levantado.

Eso es aceptable para validar resiliencia, pero no para evaluar pulido visual de happy path.

## Alcance

- Agregar un mock backend liviano para el spec visual.
- Servir fixtures realistas para endpoints principales de `/api/v1/*`.
- Mantener el baseline independiente del backend real y de la base de datos.
- Mover screenshots generados a `apps/web/test-results/visual-baseline/`.
- Mantener en `docs/last-features-for-mvp-1` solo plan y reportes.
- Verificar que no aparezcan banners `fetch failed` en screenshots happy path.

## Rutas cubiertas

- `/dashboard`
- `/dashboard/pos`
- `/dashboard/products`
- `/dashboard/products/labels`
- `/dashboard/sales`
- `/dashboard/reports`
- `/dashboard/settings`

## Endpoints mockeados

- `/api/v1/dashboard/summary`
- `/api/v1/store-day/current`
- `/api/v1/products`
- `/api/v1/products/pos`
- `/api/v1/products/qr/:code`
- `/api/v1/product-categories`
- `/api/v1/sales`
- `/api/v1/reports/sales`
- `/api/v1/stock-movements`
- `/api/v1/cash-movements`
- `/api/v1/store-day/reports`
- `/api/v1/store-day/current/events`
- `/api/v1/store-day/current/closing-preview`
- `/api/v1/store-day/current/close-report`

## Fuera de alcance

- Levantar backend real.
- Crear seeds de base de datos.
- Probar integracion real backend + DB.
- Cambiar logica de negocio.
- Convertir tablas mobile a cards.

## Criterios de aceptacion

- El spec visual funciona sin backend FastAPI.
- Las rutas principales capturan happy path con datos realistas.
- Los screenshots se generan fuera de `docs`.
- No aparecen mensajes `fetch failed` en baseline happy path.
- Se conserva la validacion de overflow horizontal y controles fuera de viewport.
- Typecheck, lint, tests, e2e y build pasan.

## Validacion requerida

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```
