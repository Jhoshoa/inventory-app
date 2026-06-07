# Sprint 3: POS operativo premium

Fecha: 2026-06-07

## Objetivo

Hacer que `/dashboard/pos` se sienta como una caja registradora profesional para uso diario: rapido, claro, enfocado en total, busqueda/escaneo y checkout.

## Alcance

- Dar mayor prominencia al total del carrito.
- Mejorar estados de busqueda y escaneo.
- Refinar carrito y checkout sticky en desktop/tablet.
- Devolver foco al buscador despues de agregar producto.
- Destacar checkout cuando el carrito tiene items.
- Mejorar empty state inicial del POS.
- Mejorar feedback cuando cambia stock o cuando un producto se agrega.

## Componentes objetivo

- `PosWorkspace`
- `PosProductSearch`
- `PosProductResults`
- `PosCart`
- `PosCheckoutPanel`

## Fuera de alcance

- Cambios de backend en ventas.
- Nuevos atajos complejos de teclado.
- Integracion con hardware de scanner.
- Cambios de permisos o roles.
- Sistema global de notificaciones.

## Criterios de aceptacion

- El flujo vender producto es claro en desktop, tablet y mobile.
- El total de venta se identifica rapidamente.
- El foco vuelve al buscador despues de agregar producto por click o codigo.
- El checkout comunica estado listo/no listo.
- El carrito comunica stock actualizado y ajustes necesarios.
- No hay overflow horizontal de documento en baseline visual.
- Typecheck, lint, unit tests, e2e y build pasan.

## Plan tecnico

1. `PosWorkspace`
   - Centralizar el handler de agregar producto.
   - Mantener una senal de feedback post-agregado.
   - Exponer foco de busqueda via `ref`.
   - Ajustar layout a dos columnas con aside sticky estable.

2. `PosProductSearch`
   - Usar `forwardRef`/`useImperativeHandle` para foco externo.
   - Mostrar panel de busqueda/escaneo mas operativo.
   - Limpiar busqueda y enfocar input tras agregar.
   - Comunicar ultimo producto agregado.

3. `PosProductResults`
   - Hacer resultados mas escaneables.
   - Diferenciar stock disponible/sin stock.
   - Mantener acciones accesibles.

4. `PosCart`
   - Hacer total mas prominente.
   - Mejorar empty state inicial.
   - Hacer items mas densos y legibles.
   - Mantener feedback de stock conflictivo.

5. `PosCheckoutPanel`
   - Destacar estado listo para venta.
   - Mostrar resumen operativo y boton principal mas claro.
   - Mantener validaciones existentes.

## Validacion requerida

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```
