# Sprint 2 premium: dashboard

Fecha: 2026-05-28

## Objetivo

Rediseñar el Dashboard como primera pantalla critica sobre la fundacion visual premium creada en Sprint 1, sin cambiar datos, permisos, endpoints ni comportamiento de negocio.

## Estado actual

- La ruta `/dashboard` ya usa App Router y mantiene data fetching en Server Component.
- `DashboardPage` carga resumen y jornada en paralelo con `Promise.all`.
- `DashboardOverview` renderiza KPIs, estado de jornada, ultimas ventas y stock bajo.
- La pantalla funciona, pero aun usa colores directos `slate-*`, cards basicas y jerarquia visual limitada.

## Alcance

- Usar `PageHeader`, `PageSection`, tokens semanticos y superficies premium.
- Refinar KPIs con iconografia, contexto y estados visuales consistentes.
- Mejorar layout responsive de jornada, metricas, ventas recientes y stock bajo.
- Mantener tablas contenidas con el componente `Table`.
- Agregar una lectura secundaria de rango/periodo y tasas disponibles si el backend las entrega.
- Actualizar `DashboardScopeTabs` al sistema visual premium.
- Actualizar tests del dashboard donde el markup cambie.

## Fuera de alcance

- Cambiar contratos de API.
- Agregar graficos.
- Cambiar POS, productos u otras pantallas.
- Implementar breadcrumbs globales.
- Convertir tablas a cards mobile avanzadas.

## Criterios de aceptacion

- `/dashboard` mantiene la funcionalidad existente.
- Empty, error y data states se renderizan correctamente.
- No hay colores hardcodeados nuevos en los componentes modificados salvo excepciones de Tailwind base ya existentes.
- `pnpm typecheck`, `pnpm lint`, tests relevantes y suite completa pasan.
- `pnpm build` pasa.

## Skills aplicados

- `next-best-practices`: conservar data fetching en Server Component y evitar mover la ruta a cliente.
- `vercel-react-best-practices`: mantener componentes pequeños, imports concretos de iconos y evitar trabajo innecesario en render.
