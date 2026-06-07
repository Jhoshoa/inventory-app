# Sprint 2 implementation report: Tablas operativas premium

Fecha: 2026-06-07

## Resultado

Sprint 2 completado. Las tablas principales ahora comparten un primitive mas operativo, con densidad compacta, alineacion semantica, estados visuales de fila y acciones compactas consistentes.

## Cambios implementados

- `Table` compartido:
  - `density="compact" | "comfortable"`;
  - alineacion `left | center | right` para headers y celdas;
  - `TableRow` con tonos `default`, `muted`, `warning`, `danger`, `success`;
  - `TableActionGroup` para acciones compactas alineadas;
  - `TableText` para truncado consistente de textos largos;
  - `tabular-nums` en columnas alineadas a la derecha.

- Tablas migradas:
  - productos;
  - ventas;
  - detalle de venta;
  - movimientos de stock;
  - movimientos de caja;
  - dashboard: ultimas ventas y stock bajo;
  - reportes: productos destacados y metodo de pago;
  - settings: matriz de permisos.

- Estados visuales aplicados:
  - productos sin stock: fila `danger`;
  - productos con stock bajo: fila `warning`;
  - ventas anuladas: fila `muted`;
  - movimientos negativos: fila `danger`;
  - movimientos positivos: fila `success`;
  - anulaciones de stock: fila `warning`;
  - salidas de caja: fila `warning`;
  - entradas de caja: fila `success`.

## Tests agregados

Se agrego cobertura en `SharedUi.test.tsx` para validar:

- densidad compacta;
- alineacion derecha;
- `tabular-nums`;
- truncado de texto;
- tono visual de fila;
- grupo de acciones alineado.

## Validacion ejecutada

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

Resultado:

- Typecheck: OK.
- Lint: OK.
- Unit tests: OK, 42 archivos y 133 tests.
- Build: OK.
- E2E: OK, 48 tests.
- Visual baseline: OK dentro de `test:e2e`, 35 rutas/viewports cubiertos.

## Nota de ejecucion

`corepack pnpm build` y `corepack pnpm test:e2e` deben ejecutarse secuencialmente. Ambos usan artefactos de Next en `.next`; correrlos en paralelo puede producir fallos transitorios durante la recoleccion de paginas o navegacion e2e.

## Riesgos restantes

- Mobile sigue usando scroll horizontal para tablas complejas. La conversion selectiva a cards queda para Sprint 6.
- El hardening con datos extremos queda para Sprint 9.
- Sprint 3 debe concentrarse en POS; no se cambiaron flujos de venta ni checkout en este sprint.
