# Sprint 6: consistencia premium de contenedores de pagina

Fecha: 2026-06-07

## Objetivo

Cerrar el pendiente menor del rediseño premium donde algunas rutas y vistas principales todavia usaban `section` con clases manuales para el layout vertical, en vez del primitivo compartido `PageSection`.

El objetivo no es rediseñar pantallas ni cambiar comportamiento, sino reducir diferencias pequeñas de estructura visual para que las paginas usen el mismo contrato de espaciado y semantica.

## Alcance

Incluido:

- Migrar contenedores principales con `className="space-y-6"` a `PageSection`.
- Cubrir rutas de dashboard, reportes, detalle de productos, detalle de ventas, etiquetas y loading states.
- Cubrir componentes de vista que funcionan como pagina:
  - `ProductDetail`
  - `SaleDetail`
  - `SettingsOverview`
  - `DashboardSkeleton`
- Mantener los `section` internos que representan subsecciones reales dentro de una pantalla.
- Mantener `space-y-6` cuando la densidad visual actual de la pantalla depende de ese espaciado.

Fuera de alcance:

- Cambiar paleta, tipografia, tablas, cards o responsive behavior.
- Reintroducir o ajustar la pagina de Importaciones.
- Crear nuevos componentes visuales.
- Modificar flujos de datos, permisos o llamadas API.

## Criterios de aceptacion

- No quedan paginas principales usando `<section className="space-y-6">` como wrapper superior cuando pueden usar `PageSection`.
- `PageHeader` y `PageSection` se mantienen como primitives de estructura.
- No se rompen snapshots, accesibilidad basica ni rutas e2e.
- Pasan:
  - `corepack pnpm typecheck`
  - `corepack pnpm lint`
  - `corepack pnpm test`
  - `corepack pnpm test:e2e`
  - `corepack pnpm build`

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
| --- | --- |
| Cambiar espaciado visual de paginas ya pulidas | Mantener `className="space-y-6"` al migrar a `PageSection` |
| Convertir subsecciones internas que no son wrappers de pagina | Limitar el cambio a rutas y componentes de vista principal |
| Romper imports o server/client boundaries | Usar solo el primitive existente `PageSection`, sin hooks ni client-only APIs |
| Ocultar un problema de layout en e2e | Ejecutar Playwright y build despues del cambio |

## Resultado esperado

El sprint deja el polish premium mas consistente sin introducir nueva funcionalidad. Las pantallas principales comparten el mismo primitivo de estructura, y las diferencias restantes de `section` quedan reservadas para subsecciones internas con significado propio.
