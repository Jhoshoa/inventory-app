# Sprint 1: Navegacion MVP y Estructura de Paginas

Fecha: 2026-05-22

## Objetivo

Corregir los puntos minimos de UX visual necesarios para cerrar el MVP sin iniciar todavia una mejora visual profunda.

Alcance exacto:

- drawer mobile para navegacion;
- sidebar desktop con item activo;
- componente `PageHeader` reutilizable para titulo, descripcion y acciones.

Este sprint no busca cambiar paleta, tablas, formularios, cards, botones globales ni responsive avanzado. Es una base pequena para que la app se sienta navegable y consistente mientras se mantiene bajo el riesgo de regresion.

## Documentos Base

- `docs/ui-design-style-enhancement/analisis-ajuste-ui.md`

## Skills Aplicados

- `next-best-practices`: mantener el layout como Server Component cuando sea posible, mover solo la interaccion del drawer a componentes cliente y evitar duplicar data fetching.
- `vercel-react-best-practices`: mantener componentes pequenos, evitar re-renders globales por navegacion, importar iconos concretos de `lucide-react` y centralizar datos estaticos de navegacion.

## Estado Actual Verificado

### Layout

Existe:

```text
apps/web/src/components/layout/AppShell.tsx
apps/web/src/components/layout/AppSidebar.tsx
apps/web/src/components/layout/AppHeader.tsx
apps/web/app/(app)/dashboard/layout.tsx
```

Comportamiento actual:

- `AppShell` renderiza sidebar desktop y header sticky.
- `AppSidebar` esta oculta en mobile.
- `AppHeader` muestra tienda, email, rol y logout.
- `AppSidebar` no marca ruta activa.
- No hay drawer mobile.
- Cada pagina define su propio `h1`, descripcion y acciones.
- No existe `PageHeader`.

### Navegacion Actual

Items actuales:

```text
Dashboard
POS
Productos
Import Image
Ventas
Reportes
Ajustes
```

Permisos actuales:

- `Import Image` depende de `canCreateImport`.
- `Ajustes` depende de `canViewSettings`.
- El resto usa acceso general.

Observaciones:

- Hay que preservar esos permisos.
- Hay que marcar rutas hijas como activas: `/dashboard/products/new` debe activar `Productos`.
- En `/dashboard/products/labels` tambien debe activar `Productos`.
- En `/dashboard/reports/stock-movements` debe activar `Reportes`.

## Decision Principal

Crear una configuracion compartida de navegacion y reutilizarla en desktop y mobile.

Archivo recomendado:

```text
apps/web/src/components/layout/navigation.ts
```

Debe exponer:

```ts
export const appNavItems = [...]
export function isNavItemActive(pathname: string, href: string): boolean
```

Razon:

- Evita duplicar items entre sidebar y drawer.
- Hace mas simple testear active states.
- Mantiene permisos centralizados.

## Alcance Sprint 1

### 1. Sidebar Activo

Modificar:

```text
apps/web/src/components/layout/AppSidebar.tsx
```

Requisitos:

- Convertirlo a Client Component si se usa `usePathname`.
- Marcar item activo con `aria-current="page"`.
- Aplicar estilo activo sobrio y consistente.
- Soportar rutas hijas.
- Mantener permisos actuales.
- No cambiar la estructura general desktop.

Estilo recomendado MVP:

```text
Activo:
- bg-slate-100 o bg-slate-900/text-white si no se toca token system todavia
- icono con mas contraste
- font-medium/semibold

Hover:
- mantener hover actual
```

No introducir tokens de color nuevos en este sprint.

### 2. Drawer Mobile

Crear componente cliente:

```text
apps/web/src/components/layout/MobileNavDrawer.tsx
```

Integracion probable:

```text
apps/web/src/components/layout/AppHeader.tsx
apps/web/src/components/layout/AppShell.tsx
```

Requisitos:

- Boton menu visible solo en mobile/tablet antes de `lg`.
- Icono `Menu` de `lucide-react`.
- Drawer lateral con los mismos items permitidos de la sidebar.
- Boton cerrar con `X`.
- Overlay oscuro discreto.
- Cerrar al hacer click en overlay.
- Cerrar al navegar.
- Cerrar con tecla `Escape`.
- Usar `aria-label`, `aria-modal`, `role="dialog"`.
- Bloquear visualmente el fondo con overlay, sin meter librerias nuevas.
- No usar bottom navigation en este MVP.

Comportamiento esperado:

```text
Mobile:
[Menu] Mi tienda                         [Salir]

Tap Menu -> drawer:
Inventory App
Dashboard
POS
Productos
Ventas
Reportes
...
```

Decisiones:

- El drawer vive como Client Component pequeno.
- `AppShell` puede seguir siendo Server Component si el drawer recibe `session.role`.
- No guardar estado del drawer en storage.
- No animaciones complejas; solo transicion simple si ya es trivial con Tailwind.

### 3. PageHeader

Crear componente:

```text
apps/web/src/components/layout/PageHeader.tsx
```

API recomendada:

```tsx
<PageHeader
  title="Productos"
  description="Busca, filtra y administra el inventario de la tienda."
  actions={<Button>Nuevo producto</Button>}
/>
```

Props:

```ts
type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
};
```

Requisitos:

- Layout responsive.
- En mobile, acciones debajo y pueden ocupar ancho natural o completo segun el boton existente.
- No implementar breadcrumbs todavia si queremos mantener sprint minimo.
- No migrar todas las paginas hijas en esta fase si aumenta el scope.

Paginas recomendadas para migrar en Sprint 1:

```text
apps/web/app/(app)/dashboard/reports/page.tsx
apps/web/app/(app)/dashboard/products/page.tsx
apps/web/app/(app)/dashboard/products/labels/page.tsx
apps/web/app/(app)/dashboard/settings/page.tsx
```

Razon:

- Son pantallas MVP recientes y visibles.
- Tienen headers repetidos.
- Productos y etiquetas son centrales para el cierre QR/SKU.

Si el tiempo es limitado, minimo migrar:

```text
Productos
Imprimir etiquetas
Reportes
```

### 4. Ajuste Menor de Labels de Navegacion

Opcional dentro de este sprint:

- Cambiar `Import Image` a `Importaciones`.

Razon:

- La app esta en espanol en el resto de navegacion.
- Es un cambio pequeno y mejora coherencia.

No cambiar nombres de rutas.

## Fuera de Alcance

- Tokens semanticos de color.
- Redisenar botones base.
- Redisenar tablas.
- Breadcrumbs completos.
- Tooltips.
- Icon buttons para tablas.
- Modo responsive tipo cards para tablas.
- Dashboard visual nuevo.
- POS visual nuevo.
- Ajustes visuales profundos de formularios.
- Tema oscuro.
- Animaciones elaboradas.
- Cambios backend.

## Archivos Probables

Crear:

```text
apps/web/src/components/layout/navigation.ts
apps/web/src/components/layout/MobileNavDrawer.tsx
apps/web/src/components/layout/PageHeader.tsx
apps/web/src/components/layout/PageHeader.test.tsx
```

Modificar:

```text
apps/web/src/components/layout/AppShell.tsx
apps/web/src/components/layout/AppSidebar.tsx
apps/web/src/components/layout/AppHeader.tsx
apps/web/src/components/layout/AppShell.test.tsx
apps/web/app/(app)/dashboard/products/page.tsx
apps/web/app/(app)/dashboard/products/labels/page.tsx
apps/web/app/(app)/dashboard/reports/page.tsx
apps/web/app/(app)/dashboard/settings/page.tsx
```

Posible test adicional:

```text
apps/web/src/components/layout/MobileNavDrawer.test.tsx
```

## Criterios de Aceptacion

Sprint 1 se considera completo cuando:

- En desktop, la sidebar muestra activo el item correspondiente a la ruta actual.
- Las rutas hijas activan el item padre correcto.
- En mobile, hay boton menu visible en el header.
- El drawer mobile muestra los mismos links permitidos que la sidebar.
- El drawer mobile cierra con overlay, boton cerrar, Escape y navegacion.
- Los items restringidos siguen ocultos segun rol.
- `PageHeader` existe y se usa al menos en Productos, Etiquetas y Reportes.
- Los headers migrados mantienen titulo, descripcion y acciones existentes.
- No se introducen dependencias nuevas.
- `pnpm typecheck` pasa.
- `pnpm lint` pasa.
- Tests de layout/nav cubren active state y permisos.

## Validacion Manual

Rutas desktop:

```text
/dashboard
/dashboard/products
/dashboard/products/new
/dashboard/products/labels
/dashboard/reports
/dashboard/reports/stock-movements
/dashboard/settings
```

Validar:

- item activo correcto;
- no hay doble scroll lateral;
- header no tapa contenido;
- logout sigue funcionando.

Rutas mobile:

```text
/dashboard/products
/dashboard/pos
/dashboard/reports
```

Validar:

- aparece boton menu;
- drawer abre y cierra;
- overlay cubre la pagina;
- al tocar un link navega y cierra;
- no hay overflow horizontal;
- acciones del `PageHeader` no se solapan.

## Riesgos y Mitigaciones

### Riesgo: convertir demasiado layout a Client Component

Mitigacion:

- Mantener `AppShell` como Server Component.
- Mover `usePathname` y estado de drawer a componentes pequenos.

### Riesgo: active state incorrecto en rutas con prefijo parecido

Mitigacion:

- `Dashboard` solo activo con `/dashboard`.
- Otros items activos si `pathname === href` o `pathname.startsWith(href + "/")`.

### Riesgo: permisos duplicados entre sidebar y drawer

Mitigacion:

- Centralizar `appNavItems`.
- Reusar el mismo filtro `item.allowed(role)`.

### Riesgo: drawer inaccesible

Mitigacion:

- `aria-label` en boton menu y cerrar.
- `role="dialog"` y `aria-modal="true"`.
- Escape para cerrar.
- Foco visual natural en botones/links.

### Riesgo: PageHeader fuerza una migracion grande

Mitigacion:

- API simple.
- Migrar solo paginas prioritarias.
- Dejar breadcrumbs para sprint posterior.

## Orden Recomendado de Implementacion

1. Extraer `navigation.ts` desde `AppSidebar`.
2. Implementar active state en `AppSidebar`.
3. Crear `MobileNavDrawer`.
4. Integrar boton menu/drawer en `AppHeader` o `AppShell`.
5. Crear `PageHeader`.
6. Migrar Productos, Etiquetas y Reportes.
7. Migrar Ajustes si el cambio no expande el scope.
8. Actualizar tests de `AppShell`.
9. Agregar tests de active state/drawer/PageHeader.
10. Ejecutar `pnpm typecheck`, `pnpm lint` y tests relevantes.

## Recomendacion Final

Este sprint debe cerrar navegacion y estructura, no estetica completa.

Despues de esto, un Sprint 2 puede abordar tokens visuales, componentes base y botones. Un Sprint 3 puede migrar tablas/formularios/pantallas operativas con mas profundidad.
