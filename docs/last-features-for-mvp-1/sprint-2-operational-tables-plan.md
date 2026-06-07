# Sprint 2: Tablas operativas premium

Fecha: 2026-06-07

## Objetivo

Mejorar la lectura y uso intensivo de tablas para tiendas con muchos productos, ventas y movimientos, sin cambiar logica de negocio ni paginacion backend.

## Principios de implementacion

- Mantener tablas densas y escaneables en desktop.
- Usar un primitive compartido para evitar estilos divergentes.
- Alinear montos, cantidades y conteos a la derecha.
- Mantener scroll horizontal controlado en mobile hasta Sprint 6.
- Resaltar estados operativos sin saturar la interfaz.
- Usar acciones compactas con iconos y tooltips cuando ya existe el patron.

## Alcance

- Refinar `Table` como primitive compartido.
- Agregar helpers para:
  - alineacion semantica de columnas;
  - filas con tono operativo;
  - grupos de acciones compactas;
  - celdas de texto truncado;
  - columnas numericas y monetarias.
- Aplicar el patron a:
  - productos;
  - ventas;
  - detalle de venta;
  - movimientos de stock;
  - movimientos de caja;
  - tablas del dashboard;
  - tablas de reportes.
- Agregar tests unitarios para validar clases, estados y renderizado de acciones.

## Fuera de alcance

- Convertir tablas a cards mobile.
- Agregar sorting backend.
- Cambiar paginacion.
- Cambiar contratos de API.
- Cambiar reglas de negocio de stock, ventas o caja.

## Criterios de aceptacion

- Las tablas comparten densidad, encabezados y bordes consistentes.
- Montos, cantidades, conteos y porcentajes quedan alineados a la derecha.
- Productos sin stock, stock bajo, ventas anuladas y movimientos sensibles tienen tratamiento visual consistente.
- Las acciones compactas no rompen mobile y conservan accesibilidad.
- No hay overflow horizontal del documento en las rutas del baseline visual.
- Tests, e2e y build siguen pasando.

## Plan tecnico

1. Extender `Table` con props y componentes tipados:
   - `density`;
   - `align`;
   - `tone`;
   - `TableRow`;
   - `TableActionGroup`;
   - `TableText`;
2. Migrar tablas por dominio con cambios acotados.
3. Validar visualmente con el baseline de Sprint 1.
4. Registrar reporte de implementacion.

## Validacion requerida

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

## Riesgos controlados

- El nuevo primitive puede afectar muchas pantallas. Se mitigara manteniendo defaults compatibles y migrando de forma explicita solo donde aporta claridad.
- La alineacion derecha puede cambiar snapshots visuales. Se valida con Playwright y tests unitarios.
