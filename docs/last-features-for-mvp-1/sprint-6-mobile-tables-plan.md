# Sprint 6: Mobile avanzado para tablas criticas

Fecha: 2026-06-07

## Objetivo

Mejorar la experiencia mobile de tablas criticas sin perder la densidad operativa de desktop.

## Alcance

- Crear un patron reusable para que tablas seleccionadas se presenten como cards en mobile.
- Mantener tablas densas en `md` y desktop.
- Aplicar el patron a:
  - productos;
  - ventas;
  - movimientos de caja;
  - cierres diarios.
- Agregar tests para labels mobile y preservacion de acciones.

## Fuera de alcance

- Cambiar paginacion backend.
- Cambiar filtros o logica de busqueda.
- Convertir todas las tablas de la app.
- Agregar sorting backend.

## Criterios de aceptacion

- Mobile permite leer registros clave sin depender solo de scroll horizontal.
- Desktop mantiene el comportamiento de tabla actual.
- Las acciones de cada fila siguen disponibles.
- No se duplica la logica de renderizado de datos.
- Typecheck, lint, tests, build y e2e pasan.

## Plan tecnico

1. Extender `Table` con un modo `mobile="cards"`.
2. Extender `TableCell` con `mobileLabel` para mostrar labels solo en mobile.
3. Aplicar el modo card a tablas candidatas.
4. Actualizar tests existentes para verificar labels y acciones.
5. Ejecutar validacion completa del frontend.

