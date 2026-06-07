# Sprint 4: Estados vacios, loading y errores accionables

Fecha: 2026-06-07

## Objetivo

Hacer que los estados vacios, loading y errores guien al usuario hacia la siguiente accion operativa sin parecer fallas o pantallas temporales.

## Alcance

- Mejorar `EmptyState` como primitive compartido.
- Reemplazar CTAs deshabilitados por acciones reales o ayuda secundaria.
- Aplicar estados accionables en productos, dashboard, ventas, reportes, caja cerrada y categorias.
- Mantener acciones condicionadas por permisos.
- Fortalecer mensajes de error para que mantengan tono profesional.
- Agregar tests donde cambie comportamiento.

## Componentes objetivo

- `components/ui/EmptyState`
- `components/ui/ErrorState`
- `features/products/components/ProductBrowser`
- `features/dashboard/components/DashboardOverview`
- `features/sales/components/SalesTable`
- `features/product-categories/components/ProductCategorySettings`
- `features/store-day/components/StoreClosedNotice`
- Tablas/resumenes de reportes con estados sin datos

## Fuera de alcance

- Sistema global de toasts.
- Cambios de backend.
- Nuevas features de negocio.
- Reescribir todas las tablas a cards mobile.
- Cambiar permisos existentes.

## Criterios de aceptacion

- Ningun empty state principal usa un CTA deshabilitado como accion.
- Productos vacios ofrece crear producto cuando el rol puede hacerlo.
- Ventas vacias ofrece ir al POS.
- Dashboard inicial guia a productos o POS segun contexto.
- Categorias vacias guia a crear categoria en la misma pantalla.
- Caja cerrada mantiene siguiente paso claro.
- Errores de conexion/backend no se ven como estados rojos genericos sin salida.
- Typecheck, lint, tests, build y e2e pasan.

## Plan tecnico

1. `EmptyState`
   - Aceptar `action` como `ReactNode`.
   - Mantener compatibilidad con `actionLabel` solo si viene con `actionHref`.
   - Agregar `icon`, `secondaryAction`, `tone` y `className`.
   - Evitar renderizar botones deshabilitados.

2. Productos
   - Cambiar empty inventory a CTA real hacia `/dashboard/products/new`.
   - Para roles sin permiso, mostrar ayuda sin CTA primaria.

3. Dashboard
   - Convertir empty inicial a CTA real hacia productos.
   - Mantener mensaje operativo para tienda sin actividad.

4. Ventas y reportes
   - Reemplazar textos simples por estados accionables donde la pantalla queda vacia.
   - Para ventas vacias, ofrecer ir al POS.
   - Para reportes sin datos, indicar cambiar rango o registrar ventas.

5. Categorias y caja
   - Convertir categorias vacias en una guia embebida hacia el formulario existente.
   - Refinar caja cerrada para comunicar el siguiente paso por rol.

## Validacion requerida

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```
