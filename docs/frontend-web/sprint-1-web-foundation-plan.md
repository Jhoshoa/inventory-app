# Sprint 1 Web Foundation Plan

Fecha: 2026-05-19

## Objetivo

Dejar `apps/web` con una base navegable, testeable y lista para consumir el backend v1. Este sprint no busca construir todas las pantallas; busca corregir rutas, auth, proxy/API client, layout, componentes UI minimos y pruebas para que productos y POS puedan avanzar sin rehacer fundacion.

## Contexto Actual

`apps/web` ya existe con Next.js 15, React 19, TypeScript strict, Tailwind, lucide-react, axios y zustand. Hay rutas iniciales para login, dashboard y productos, pero aun son placeholders. El proxy `app/api/[...path]/route.ts` solo devuelve `{ message: "API proxy" }`.

Riesgo principal: `app/(dashboard)` es un route group, no crea el segmento `/dashboard`. Los links actuales apuntan a `/dashboard`, `/dashboard/products`, etc., pero la estructura real no garantiza esas rutas. Antes de implementar features, hay que corregir esa topologia.

## Skills Aplicados

- `next-best-practices`: rutas App Router, Server Components, Route Handlers, cookies async y errores.
- `vercel-react-best-practices`: evitar waterfalls, limitar JavaScript cliente, paralelizar fetches y mantener UI estable.
- `typescript-advanced-types`: contrato API tipado, errores discriminados, formularios y helpers estrictos.

## Alcance Incluido

- Corregir rutas publicas y autenticadas.
- Crear layout autenticado responsive con sidebar y header.
- Crear componentes UI base: `Button`, `Input`, `Label`, `Table`, `Badge`, `Dialog`, `Toast` o equivalente pragmatico.
- Crear configuracion de entorno para `BACKEND_API_URL`.
- Implementar proxy real `/api/[...path]` hacia FastAPI.
- Crear cliente API tipado con wrapper de `fetch`.
- Preparar generacion OpenAPI hacia TypeScript.
- Implementar login/logout basico con cookies httpOnly.
- Proteger rutas autenticadas.
- Agregar Vitest, React Testing Library, MSW y Playwright.
- Agregar dashboard inicial con estados loading/empty/error usando datos mockeables.

## Fuera de Alcance

- CRUD completo de productos.
- POS funcional.
- Importacion OCR.
- Exports CSV desde UI.
- Offline web con IndexedDB.
- Roles complejos por pantalla, salvo preparar helpers para `owner` y `cashier`.

## Estructura Objetivo

```text
apps/web/
  app/
    page.tsx
    layout.tsx
    globals.css
    (auth)/
      login/page.tsx
      register/page.tsx
    (app)/
      dashboard/
        layout.tsx
        page.tsx
        products/page.tsx
        sales/page.tsx
        reports/page.tsx
        settings/page.tsx
    api/
      auth/login/route.ts
      auth/logout/route.ts
      [...path]/route.ts
  src/
    components/ui/
    components/layout/
    features/auth/
    features/dashboard/
    lib/api/
    lib/auth/
    lib/env/
    lib/format/
    test/
```

Decision de rutas: mantener `/login` para auth y usar `/dashboard` como raiz autenticada. Las paginas hijas deben quedar debajo de un segmento real `dashboard`, no solo dentro de un route group.

## Implementacion por Pasos

### 1. Rutas y Navegacion

- Mover dashboard a `app/(app)/dashboard/page.tsx`.
- Mover productos a `app/(app)/dashboard/products/page.tsx`.
- Agregar placeholders para `sales`, `reports` y `settings`.
- Mantener `app/page.tsx` redirigiendo a `/login` o `/dashboard` segun sesion.
- Reemplazar `<a>` internos por `next/link`.
- Usar iconos de `lucide-react` en sidebar.

Validaciones:

- `/login` carga sin sesion.
- `/dashboard` existe.
- `/dashboard/products` existe.
- Links del sidebar no llevan a 404.

### 2. Layout Autenticado

- Crear `src/components/layout/AppSidebar.tsx`.
- Crear `src/components/layout/AppHeader.tsx`.
- Crear `src/components/layout/AppShell.tsx`.
- Layout debe ser responsive: sidebar fijo en desktop, navegacion compacta en mobile.
- Evitar cards anidadas; usar contenedores de pagina y tarjetas solo para metricas concretas.

Reglas:

- Componentes de layout deben ser Server Components por defecto.
- Solo marcar como client los controles que dependan de estado interactivo.
- No pasar funciones ni objetos no serializables desde Server Components a Client Components.

### 3. Configuracion y Entorno

- Crear `src/lib/env/server.ts` para leer `BACKEND_API_URL`.
- Crear `apps/web/.env.example`.
- Validar que `BACKEND_API_URL` exista en runtime server.
- No exponer el backend URL como `NEXT_PUBLIC_*` salvo que decidamos llamadas directas desde navegador.

Variables:

```text
BACKEND_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Inventory App
```

### 4. API Client y Proxy

- Implementar `src/lib/api/errors.ts` con `ApiError`.
- Implementar `src/lib/api/client.ts` con `apiRequest<T>()`.
- Normalizar respuestas 401, 403, 404, 409, 422 y 500.
- Implementar `app/api/[...path]/route.ts` como proxy real para GET, POST, PATCH, PUT y DELETE.
- Reenviar headers seguros: `authorization`, `content-type`, `accept`.
- No reenviar cookies arbitrarias al backend; extraer token httpOnly de cookie propia.

Tipo recomendado:

```ts
type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
```

### 5. Auth Inicial

- Crear `src/lib/auth/session.ts` para leer cookies con APIs async de Next 15.
- Crear `app/api/auth/login/route.ts` que llame al backend y setee cookie httpOnly.
- Crear `app/api/auth/logout/route.ts` que elimine cookies.
- Crear `requireSession()` para proteger layout autenticado.
- Redirigir a `/login` cuando falte sesion.

Reglas:

- No persistir access token en `localStorage`.
- Cookies con `httpOnly`, `sameSite=lax`, `secure` en produccion.
- El frontend no debe confiar en roles solo para seguridad; backend sigue validando permisos.

### 6. UI Base

Crear componentes minimos con Tailwind:

- `Button`: variantes `primary`, `secondary`, `ghost`, `danger`.
- `Input`: estados normal, error, disabled.
- `Label`.
- `Badge`: `default`, `success`, `warning`, `danger`.
- `Table`: header, body, empty row.
- `Dialog`: para confirmaciones futuras.
- `Toast` o `Alert`: para errores globales.

Reglas visuales:

- Radio de bordes maximo 8px salvo componentes existentes.
- Tablas densas y escaneables.
- Botones de herramientas con icono lucide cuando aplique.
- Texto sin overflow en mobile.

### 7. Dashboard Inicial

- Crear `src/features/dashboard/types.ts`.
- Crear `src/features/dashboard/api.ts`.
- Crear componentes de metricas, low stock y latest sales.
- Cargar datos en Server Component cuando sea posible.
- Si backend no esta disponible en tests, usar MSW o fixtures.

Estados requeridos:

- Loading con skeleton estable.
- Empty state con accion hacia productos.
- Error con reintento.
- Forbidden si backend responde 403.

## Dependencias de Testing

Agregar dev dependencies:

```powershell
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw playwright
```

Agregar scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test"
}
```

## Tests Requeridos

### Unit/API

1. `apiRequest_returns_data_for_2xx`
2. `apiRequest_normalizes_401_error`
3. `apiRequest_normalizes_422_validation_error`
4. `proxy_forwards_method_path_query_and_body`
5. `session_reads_http_only_cookie`

### Componentes

6. `LoginPage_validates_required_fields`
7. `LoginPage_shows_invalid_credentials_error`
8. `AppShell_renders_navigation_links`
9. `Dashboard_renders_empty_state`
10. `Dashboard_renders_error_state`

### E2E

11. `unauthenticated_user_is_redirected_to_login`
12. `mocked_login_reaches_dashboard`
13. `sidebar_navigation_opens_products_page`

## Comandos de Validacion

```powershell
cd apps/web
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Si `next lint` falla por cambios recientes de Next, ajustar el script a ESLint CLI como parte del sprint.

## Criterios de Aceptacion

- `/login`, `/dashboard` y `/dashboard/products` funcionan.
- Las rutas autenticadas rechazan usuarios sin sesion.
- El proxy llama al backend configurado por `BACKEND_API_URL`.
- El API client centraliza errores y no usa `any`.
- Login/logout manejan cookies httpOnly.
- Existen componentes UI base reutilizables.
- Dashboard inicial muestra loading, empty, error y data.
- `pnpm typecheck`, `pnpm test` y `pnpm build` pasan.
- Playwright cubre login mockeado y navegacion principal.

## Riesgos y Decisiones

- **Generacion OpenAPI:** si el backend no esta corriendo durante CI, usar un `openapi.json` exportado en repo o generar en job previo. Recomendacion: mantener comando manual al inicio y automatizar despues.
- **Proxy vs llamadas directas:** usar proxy/BFF para proteger tokens. Llamadas directas desde browser pueden esperar hasta tener una razon fuerte.
- **shadcn/ui:** no instalar todavia salvo que acelere dialog/table/toast. Los componentes propios son suficientes para Sprint 1.
- **Zustand:** no usarlo para estado servidor. Reservarlo para estado local de UI o carrito POS en sprints futuros.
- **Axios:** preferir `fetch` para server/client compatibility en Next. Se puede remover mas adelante si queda sin uso.

## Resultado Esperado

Al cerrar Sprint 1, la web debe tener una fundacion seria: rutas correctas, layout estable, auth inicial, proxy funcional, cliente API tipado y tests. Con eso, Sprint 2 puede enfocarse en productos reales sin arrastrar deuda de arquitectura.
