# Sprint 6 Web V1 Hardening and Release Readiness Plan

Fecha: 2026-05-21

## Objetivo

Preparar `apps/web` para una V1 operable y verificable. Los Sprints 1-5 ya cubren la funcionalidad principal: auth, dashboard, productos, POS, ventas, reportes, exports, permisos e importacion asistida. Sprint 6 no debe agregar una feature grande nueva; debe reducir riesgo de release con accesibilidad, error boundaries, observabilidad, performance, pruebas E2E criticas, configuracion de deploy y limpieza de deuda tecnica.

## Estado Actual Verificado

### Ya existe en `apps/web`

- Next.js 15 App Router con rutas autenticadas bajo `/dashboard`.
- Auth con cookies httpOnly y BFF/Route Handlers.
- API client tipado manualmente con `ApiError`.
- Layout operativo con sidebar/header.
- Productos completos.
- POS y ventas.
- Anulacion de ventas.
- Reportes, stock movements globales y exports CSV.
- Settings ligero con matriz de permisos.
- Importacion asistida por foto/OCR con revision y confirmacion.
- Tests unitarios/componentes con Vitest/Testing Library.
- E2E base con Playwright.
- `typecheck`, `lint`, `test`, `build` y `test:e2e` pasan despues de limpiar cache `.next` cuando Next manifiesta inconsistencias.
- ESLint ignora `.next`, `playwright-report` y `test-results`.

### Riesgos/deuda observada

- No hay `app/error.tsx`, `app/global-error.tsx` ni errores por segmento autenticado.
- No hay `not-found.tsx` custom.
- No hay instrumentacion/observabilidad frontend.
- No hay medicion de accesibilidad automatizada.
- E2E aun cubre pocos flujos comparado con la superficie V1; imports/reportes/exports no tienen E2E critico.
- No hay estrategia clara de deploy web: variables, `output`, health/smoke checks, build clean.
- `next build` ha mostrado fallos de manifiesto cuando `.next` queda inconsistente; hay que formalizar limpieza de artefactos en CI/local.
- `axios` y `zustand` siguen instalados, pero el codigo actual usa principalmente `fetch` y estado local.
- `openapi:types` existe, pero no hay contrato generado usado en CI.
- El metadata global es minimo.
- No hay `robots`, `manifest`, iconos ni metadata de app para una experiencia instalada/PWA parcial.
- No hay policy clara de offline web; V1 puede ser online-first, pero debe tener estados de network error consistentes.

## Skills Aplicados

- `next-best-practices`: error boundaries, metadata, route handlers, dynamic routes con cookies, self-hosting, build/deploy y file conventions.
- `vercel-react-best-practices`: evitar waterfalls, revisar bundle/client JS, diferir codigo pesado, medir rutas criticas y reducir renders innecesarios.
- `typescript-advanced-types`: contratos de error/estado discriminados, helpers de validacion, action states consistentes y eliminacion de `any`/tipos ambiguos.

## Alcance Incluido

- Error boundaries globales y por segmento autenticado.
- `not-found.tsx` custom para App Router.
- Estados de error/forbidden/network consistentes.
- Accesibilidad automatizada con Playwright + axe o equivalente.
- E2E critico ampliado para reportes, imports, exports y permisos.
- Smoke tests de rutas principales.
- Bundle/performance audit y limpieza de dependencias no usadas.
- Preparacion de deploy: variables, build clean, output strategy, smoke command.
- Observabilidad minima: Sentry opcional o instrumentation hooks, request id en errores y logs de cliente controlados.
- Metadata web basica: title template, description, viewport/theme color, manifest/robots si aplica.
- Hardening de formularios/dialogs: foco, teclado, labels, disabled states y mensajes.
- Documentacion operativa web en `docs/frontend-web`.

## Fuera de Alcance

- Rediseno visual grande.
- Mobile app.
- Offline-first completo con IndexedDB/sync.
- Service worker complejo.
- Autenticacion multi-tenant avanzada o gestion real de usuarios.
- Matching avanzado de imports contra productos existentes.
- Integracion fiscal/pagos/impresion.
- Observabilidad completa con dashboards externos.

## Estructura Objetivo

```text
apps/web/
  app/
    error.tsx
    global-error.tsx
    not-found.tsx
    manifest.ts
    robots.ts
    (app)/dashboard/
      error.tsx
      not-found.tsx
  src/
    components/ui/
      ErrorState.tsx
      ForbiddenState.tsx
      RetryLink.tsx
    lib/
      observability/
        client.ts
        server.ts
      diagnostics/
        request-id.ts
    test/
      a11y.ts
  e2e/
    reports.spec.ts
    imports.spec.ts
    permissions.spec.ts
    smoke.spec.ts
  docs or README section:
    deployment checklist
```

No introducir una libreria de UI nueva. El sistema actual con Tailwind y componentes propios es suficiente.

## Areas de Trabajo

### 1. Error Boundaries y Estados Degradados

Agregar:

- `app/error.tsx`
- `app/global-error.tsx`
- `app/not-found.tsx`
- `app/(app)/dashboard/error.tsx`
- `app/(app)/dashboard/not-found.tsx`
- `src/components/ui/ErrorState.tsx`
- `src/components/ui/ForbiddenState.tsx`

Reglas:

- Error boundaries deben ser Client Components.
- Mostrar mensaje humano y accion clara: reintentar o volver al dashboard.
- No filtrar stack traces.
- Mantener `reset()` disponible en `error.tsx`.
- `not-found` debe ofrecer volver a dashboard/productos segun contexto.
- Usar `unstable_rethrow` solo si se agregan catch blocks complejos en Server Components.

### 2. Error Contract Frontend

Unificar mensajes para:

- `401`: sesion expirada o no autenticado.
- `403`: accion requiere owner.
- `404`: recurso no encontrado.
- `409`: estado invalido/conflicto operativo.
- `422`: revisar campos.
- `network_error`: backend no disponible.

Crear helper si hace falta:

```ts
function userMessageForApiError(error: ApiError): string
```

Usarlo gradualmente en acciones y paginas con mayor impacto:

- ventas/anulacion.
- imports confirm/cancel/update.
- exports.
- productos create/update/delete.

### 3. Accesibilidad

Agregar una verificacion automatizada con Playwright + axe:

- Instalar `@axe-core/playwright` como dev dependency.
- Crear helper `src/test/a11y.ts` o `e2e/a11y.spec.ts`.
- Ejecutar en rutas principales con sesion mock:
  - `/login`
  - `/dashboard`
  - `/dashboard/products`
  - `/dashboard/pos`
  - `/dashboard/reports`
  - `/dashboard/imports`

Checklist manual:

- Dialogs capturan/retornan foco o al menos tienen foco inicial razonable.
- Botones icon-only tienen nombre accesible.
- Inputs tienen labels.
- Tablas tienen headers.
- Estados de error usan `role="alert"`.
- Navegacion principal tiene label.
- Contraste de badges/alerts suficiente.
- Acciones deshabilitadas explican motivo cuando aplica.

### 4. E2E Critico V1

Ampliar Playwright:

- `reports.spec.ts`
  - reportes renderizan resumen mockeado.
  - filtros de fecha actualizan URL.
  - cashier no puede exportar.
  - owner ve links de export.
- `imports.spec.ts`
  - pagina de imports renderiza empty/list.
  - upload mock crea import y redirige a detalle.
  - editar/aprobar item.
  - cashier no puede confirmar.
  - owner confirma import y ve resultado.
- `permissions.spec.ts`
  - owner vs cashier en exports/import confirmation/void sale.
- `smoke.spec.ts`
  - rutas principales no 500 con sesion mock.

Mantener mocks de backend en E2E para no depender de OCR real ni FastAPI levantado.

### 5. Performance y Bundle

Auditar:

- Componentes `use client` innecesarios.
- Imports de `lucide-react` directos y razonables.
- Dependencias no usadas: `axios`, `zustand`.
- JS de rutas grandes:
  - `/dashboard/imports/[importId]`
  - `/dashboard/pos`
  - `/dashboard/products`
- Formularios/dialogs pesados: evaluar `next/dynamic` solo si hay evidencia.

Acciones recomendadas:

- Remover dependencias no usadas si no hay imports reales.
- Mantener POS como Client Component, pero revisar que busqueda no cargue productos completos.
- Evitar pasar objetos grandes a Client Components desde Server Components.
- Agregar script opcional `analyze` si se decide usar bundle analyzer; no bloquear Sprint 6 si agrega complejidad.

### 6. Metadata y App Shell

Actualizar:

- `metadata` con title template:

```ts
title: {
  default: "Inventory App",
  template: "%s | Inventory App",
}
```

- description mas especifica.
- `applicationName`.
- `robots.ts` si la app autenticada no debe indexarse.
- `manifest.ts` basico si se quiere instalabilidad ligera.
- `themeColor`/viewport segun convenciones de Next 15.

No crear landing page. La app sigue siendo herramienta operativa.

### 7. Deploy Readiness

Documentar y/o implementar:

- `.env.example` completo:
  - `BACKEND_API_URL`
  - `NEXT_PUBLIC_APP_NAME`
  - `NEXT_PUBLIC_APP_URL`
  - `SENTRY_DSN` o `NEXT_PUBLIC_SENTRY_DSN` si se adopta.
- Build local limpio:

```powershell
Remove-Item -LiteralPath .next -Recurse -Force
corepack pnpm build
```

- Script recomendado:

```json
"clean": "rimraf .next test-results playwright-report"
```

Decision: en Windows, si no se agrega `rimraf`, documentar comando PowerShell. Si se agrega dependencia, justificarlo por CI cross-platform.

- Considerar `output: "standalone"` si se desplegara con Docker/self-host.
- Smoke command post-build:

```powershell
corepack pnpm start
corepack pnpm test:e2e --project=chromium
```

### 8. Observabilidad

Opcion A, minima sin nueva dependencia:

- Helper `reportClientError(error, context)`.
- Centralizar `console.error` solo en development o detras de wrapper.
- Propagar request id si backend lo retorna en headers.
- Mostrar request id en errores criticos si esta disponible.

Opcion B, Sentry:

- Instalar `@sentry/nextjs`.
- Configurar `instrumentation.ts`.
- Capturar errores de Client/Server Components.
- Enmascarar datos sensibles.

Recomendacion: planificar Sentry como opcional del sprint. Si el deploy real esta cerca, implementarlo; si no, dejar wrapper propio para no introducir credenciales/config prematuramente.

### 9. CI Web

Crear o actualizar workflow web:

```text
.github/workflows/ci-web.yml
```

Pasos:

1. Checkout.
2. Setup Node/Corepack.
3. `corepack enable`.
4. `corepack pnpm install --frozen-lockfile`.
5. `corepack pnpm typecheck`.
6. `corepack pnpm lint`.
7. `corepack pnpm test`.
8. `corepack pnpm build`.
9. `corepack pnpm test:e2e`.

Notas:

- Cachear pnpm store.
- Asegurar que `.next` no se restaure corrupto.
- Subir Playwright traces en fallo.
- Si E2E tarda demasiado, separar `test:e2e` en job dependiente.

## Tests Requeridos

### Unit/API

1. `userMessageForApiError_maps_401_403_409_422_network`
2. `ErrorState_renders_retry_action`
3. `ForbiddenState_renders_owner_message`
4. `metadata_exports_expected_defaults`
5. `requestIdFromHeaders_reads_x_request_id` si se implementa.

### Componentes

6. `DashboardErrorBoundary_renders_reset_button`
7. `GlobalNotFound_renders_dashboard_link`
8. `Dialog_components_have_accessible_names`
9. `ImportConfirmPanel_explains_disabled_owner_action`
10. `ExportPanel_explains_disabled_owner_action`

### E2E

11. `smoke_authenticated_routes_do_not_500`
12. `reports_filters_and_exports_permissions`
13. `imports_upload_review_confirm_happy_path_mocked`
14. `cashier_permission_boundaries`
15. `not_found_page_renders_for_unknown_dashboard_route`

### A11y

16. `a11y_login_has_no_critical_violations`
17. `a11y_dashboard_has_no_critical_violations`
18. `a11y_products_has_no_critical_violations`
19. `a11y_pos_has_no_critical_violations`
20. `a11y_reports_has_no_critical_violations`
21. `a11y_imports_has_no_critical_violations`

## Comandos de Validacion

```powershell
cd apps/web
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

Si se agrega a11y separado:

```powershell
corepack pnpm test:e2e --grep a11y
```

Build limpio recomendado:

```powershell
cd apps/web
Remove-Item -LiteralPath .next -Recurse -Force
corepack pnpm build
```

## Criterios de Aceptacion

- La app tiene error boundaries globales y autenticados.
- Rutas desconocidas muestran `not-found` util.
- Errores 401/403/409/422/network tienen mensajes consistentes.
- A11y automatizado cubre rutas principales sin violaciones criticas.
- E2E cubre imports, reports, permissions y smoke de rutas principales.
- Dependencias no usadas se remueven o se justifica conservarlas.
- Metadata/robots/manifest basicos estan definidos.
- CI web ejecuta typecheck, lint, tests, build y E2E.
- Build limpio funciona sin depender de cache `.next`.
- Documentacion de deploy web existe y lista env vars requeridas.

## Riesgos y Decisiones

- **Sentry ahora o despues:** si no hay DSN real, implementar wrapper minimo y dejar Sentry como tarea opcional. Si hay deploy staging, integrar Sentry.
- **Axe puede ser ruidoso:** iniciar bloqueando solo violaciones criticas/serias para evitar friccion falsa.
- **E2E demasiado lento:** dividir smoke/critical en CI y dejar flows largos para nightly si hace falta.
- **Offline web:** mantener online-first en V1. Offline serio pertenece a mobile; web solo debe manejar network errors con claridad.
- **Build cache corrupto:** no perseguir bugs internos de Next sin evidencia; limpiar `.next` en CI/local antes de build release.
- **`output: standalone`:** activarlo solo si el destino de deploy sera Docker/self-host. Para Vercel, no hace falta.

## Resultado Esperado

Al cerrar Sprint 6, `apps/web` estara lista como release candidate V1: funcionalidad principal completa, errores controlados, accesibilidad basica verificada, E2E sobre flujos criticos, build/deploy reproducible, observabilidad minima y deuda tecnica prioritaria reducida. Desde ahi la recomendacion es pasar a staging real, pruebas con datos de tienda y luego definir Sprint 7 segun feedback operativo: usuarios/roles reales, mobile offline o mejoras de import matching.
