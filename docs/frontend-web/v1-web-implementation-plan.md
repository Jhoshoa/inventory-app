# Frontend Web V1 Implementation Plan

Fecha: 2026-05-19

## Objetivo

Iniciar la app web como el primer cliente real del backend v1. La web debe servir para administracion diaria de tiendas pequenas y mayoristas: productos, inventario, ventas, importacion asistida, reportes y configuracion. Mobile vendra despues, por lo que la web debe validar contratos, flujos y patrones reutilizables sin acoplarse a detalles exclusivos de navegador.

## Skills Aplicados

- `next-best-practices`: App Router, Server Components, Route Handlers, manejo de errores y APIs async.
- `vercel-react-best-practices`: evitar waterfalls, reducir bundle cliente, paralelizar fetches y mantener componentes estables.
- `typescript-advanced-types`: cliente API tipado, DTOs estrictos, estados discriminados y validaciones de formularios.

## Estado Actual de `apps/web`

La base existe con Next.js 15, React 19, TypeScript strict, Tailwind, lucide-react, axios y zustand. Hay pantallas iniciales para login, dashboard y productos, mas un route handler `app/api/[...path]/route.ts` que hoy solo responde un placeholder.

Riesgos iniciales:

- `app/(dashboard)/page.tsx` no crea la ruta `/dashboard`; los route groups no agregan path. Actualmente puede chocar con `app/page.tsx` y los links del sidebar apuntan a rutas inexistentes.
- No hay suite de tests web instalada.
- No hay cliente API tipado desde OpenAPI.
- El proxy `/api/[...path]` no reenvia requests al backend.
- Login es solo visual; no maneja cookies, tokens, errores ni proteccion de rutas.

## Principios de Arquitectura

- Usar App Router con Server Components por defecto. Marcar `'use client'` solo en formularios, tablas interactivas, filtros, POS y controles con estado local.
- Mantener una UI operativa, densa y clara. No construir landing page; la primera experiencia autenticada debe ser dashboard o flujo de tienda.
- Usar el backend como fuente de verdad y OpenAPI como contrato. Evitar tipos duplicados manualmente cuando ya puedan generarse.
- Preferir un BFF liviano con Route Handlers para auth y proxy cuando necesitemos cookies httpOnly o proteger tokens.
- Separar por dominio: `products`, `sales`, `inventory`, `imports`, `reports`, `auth`, `store`.
- Validar formularios en cliente y servidor. El cliente mejora UX; el backend sigue siendo autoridad.
- Desde el primer sprint, cada cambio funcional debe incluir pruebas unitarias/componentes y, para flujos criticos, E2E.

## Estructura Recomendada

```text
apps/web/
  app/
    (auth)/login/page.tsx
    (auth)/register/page.tsx
    (app)/dashboard/page.tsx
    (app)/products/page.tsx
    (app)/sales/page.tsx
    (app)/inventory/page.tsx
    (app)/imports/page.tsx
    (app)/reports/page.tsx
    (app)/settings/page.tsx
    api/[...path]/route.ts
  src/
    components/ui/
    components/layout/
    features/auth/
    features/products/
    features/sales/
    features/inventory/
    features/imports/
    features/reports/
    lib/api/
    lib/auth/
    lib/env/
    lib/format/
    test/
```

Decision inicial: mover las rutas autenticadas a `app/(app)/dashboard/...` o crear un segmento real `app/(app)/dashboard/page.tsx`. Los links deben coincidir con rutas reales. Si queremos `/dashboard/products`, la carpeta debe ser `app/(app)/dashboard/products/page.tsx`.

## Cliente API y Auth

El backend ya esta listo para ser consumido por web/mobile. La web debe generar tipos desde OpenAPI con `openapi-typescript` u `orval`. Para v1 recomiendo:

- `openapi-typescript` para generar tipos simples y estables.
- Un wrapper propio `src/lib/api/client.ts` para fetch, errores, auth y request id.
- Route handlers para login/logout/refresh si se guardan tokens en cookies httpOnly.
- No guardar access tokens permanentes en `localStorage`.

Flujo recomendado:

1. `POST /api/auth/login` llama al backend y setea cookies httpOnly.
2. Server Components leen cookies con APIs async de Next 15.
3. Requests desde servidor usan el token de cookie.
4. Client Components llaman a Server Actions o route handlers propios cuando necesiten mutar.
5. Errores se normalizan en un tipo `ApiError` con `status`, `message` y `details`.

## Pantallas V1

Prioridad 1:

- Login y registro con creacion de tienda.
- Dashboard con ventas de hoy, stock bajo y ultimas ventas.
- Productos con tabla, busqueda, filtros, paginacion, crear/editar, QR y ajuste de stock.
- POS web simple: buscar producto, carrito, metodo de pago, confirmar venta.

Prioridad 2:

- Historial de ventas, detalle y anulacion.
- Historial de movimientos de stock por producto y global.
- Importacion asistida: subir foto, revisar items OCR, confirmar productos.
- Reportes y export CSV.
- Configuracion de tienda y usuarios.

## UI y UX

La app debe sentirse como herramienta de trabajo, no marketing. Usar sidebar, header compacto, tablas densas, filtros visibles y acciones claras. Los botones de herramientas deben usar iconos lucide cuando aplique. Evitar cards anidadas y secciones flotantes excesivas.

Estados obligatorios por pantalla:

- Loading con skeleton estable.
- Empty state con accion primaria concreta.
- Error con reintento.
- Forbidden cuando el rol no permite la accion.
- Formularios con errores por campo y submit bloqueado mientras procesa.

Para tablas de hasta 1000 productos, usar paginacion del backend, debounce en busqueda y columnas estables. Virtualizacion puede esperar hasta que haya evidencia de lentitud.

## Testing Desde el Inicio

Agregar en Sprint Web 1:

- Vitest para unit tests.
- React Testing Library y `@testing-library/user-event` para componentes.
- MSW para mocks de API.
- Playwright para E2E criticos.
- `tsc --noEmit` como typecheck obligatorio.

Comandos objetivo:

```powershell
cd apps/web
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Tests iniciales:

- Login valida email/password y muestra error de credenciales.
- Layout autenticado redirige si no hay sesion.
- API client serializa errores 401/403/422/500.
- Products page renderiza loading, empty, error y lista.
- Product form valida nombre, precio, stock y min stock.
- POS no permite vender mas stock del disponible.
- Playwright cubre login mockeado, crear producto y confirmar venta.

## Sprint Web 1 Recomendado

Objetivo: dejar una base navegable, testeada y conectable al backend.

Incluye:

- Corregir topologia de rutas.
- Implementar layout autenticado con sidebar responsive.
- Crear sistema minimo de UI: button, input, table, dialog, badge, toast.
- Configurar env vars: `NEXT_PUBLIC_APP_URL`, `BACKEND_API_URL`.
- Implementar proxy real `/api/[...path]` o decidir consumo directo del backend.
- Generar tipos OpenAPI y crear wrapper API.
- Implementar login/logout con cookies httpOnly.
- Proteger rutas autenticadas.
- Agregar Vitest, Testing Library, MSW y Playwright.
- Crear primera version de Dashboard consumiendo datos mockeados o backend real si esta disponible.

Criterios de aceptacion:

- `pnpm typecheck`, `pnpm test` y `pnpm build` pasan.
- Rutas `/login`, `/dashboard`, `/dashboard/products` funcionan.
- Una sesion invalida no entra al dashboard.
- El cliente API esta tipado y centraliza errores.
- Hay tests para auth, API client y al menos una pantalla autenticada.

## Roadmap Posterior

Sprint Web 2: productos completos, formularios, busqueda, paginacion, QR y stock bajo.

Sprint Web 3: POS, ventas, detalle de venta y anulacion.

Sprint Web 4: movimientos de stock, reportes, exports CSV y permisos por rol.

Sprint Web 5: importacion asistida por foto/OCR, revision de items y confirmacion.

Sprint Web 6: hardening: accesibilidad, performance, estados offline parciales, Sentry y preparacion deploy.

## Decisiones Pendientes

- Elegir `openapi-typescript` vs `orval`. Para comenzar simple, `openapi-typescript` mas wrapper propio es suficiente.
- Decidir si la web usara BFF completo con cookies o llamadas directas al backend con token en memoria. Recomendacion: BFF para auth.
- Definir UI kit: continuar con Tailwind propio o agregar shadcn/ui. Recomendacion: componentes propios minimos al inicio; shadcn solo si acelera dialog, table, dropdown y toast sin inflar complejidad.
- Definir alcance offline web. Para v1 web, offline parcial puede esperar; mobile sera el cliente offline fuerte.

## Recomendacion

Comenzar con Sprint Web 1 antes de sumar pantallas. Corregir rutas, auth, cliente API y testing ahora evita rehacer cada feature despues. Cuando esa base pase typecheck, tests y build, productos y POS se pueden implementar con mucha menos friccion.
