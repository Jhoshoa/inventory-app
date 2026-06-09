# Sprint 6: Mobile avanzado para tablas criticas - reporte

Fecha: 2026-06-07

## Resultado

Sprint 6 mejora la lectura mobile de tablas criticas usando un patron reusable de cards responsivas sin duplicar datos ni cambiar la experiencia densa de desktop.

## Cambios implementados

- `Table`
  - Agrega `mobile="cards"` como modo opt-in.
  - Mantiene `mobile="scroll"` como comportamiento por defecto.
  - Agrega `mobileLabel` en `TableCell` para mostrar etiquetas solo en mobile.
  - Conserva alineacion numerica y densidad existente en desktop.

- Productos
  - Convierte filas mobile en cards con labels: producto, codigo, categoria, precio, stock, estado y acciones.
  - Mantiene acciones por rol sin cambios.

- Ventas
  - Convierte filas mobile en cards con fecha, estado, metodo, items, total y acciones.
  - Mantiene link de detalle de venta.

- Movimientos de caja
  - Convierte filas mobile en cards con fecha, tipo, monto y nota.
  - Mantiene tono visual de entrada/salida.

- Cierres diarios
  - Extrae la tabla a `StoreDayCloseReportsTable`.
  - Aplica cards mobile para fecha, ventas, efectivo esperado, efectivo contado, diferencia y acciones.

## Tests agregados o ajustados

- `ProductTable.test.tsx`
- `SalesTable.test.tsx`
- `CashMovementsTable.test.tsx`
- `StoreDayCloseReportsTable.test.tsx`
- `SharedUi.test.tsx` se mantiene compatible con el primitive actualizado.

## Validacion ejecutada

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm exec playwright test
```

Resultado:

- Typecheck: OK.
- Lint: OK.
- Unit tests: 48 archivos, 155 tests OK.
- Build: OK.
- E2E: 48 tests OK.

## Riesgo residual

- Sprint 6 cubre las candidatas definidas en el backlog. Tablas secundarias como movimientos de stock o reportes internos pueden evaluarse en Sprint 9 con datos extremos antes de cerrar el MVP visual.

