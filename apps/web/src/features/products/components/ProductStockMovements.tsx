import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
  TableText,
} from "@/components/ui/Table";
import type { StockMovement } from "../types";

export function ProductStockMovements({
  movements,
}: {
  movements: StockMovement[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-text-strong">Movimientos de stock</h2>
      <Table density="compact">
        <thead>
          <tr>
            <TableHeaderCell>Fecha</TableHeaderCell>
            <TableHeaderCell>Tipo</TableHeaderCell>
            <TableHeaderCell align="right">Delta</TableHeaderCell>
            <TableHeaderCell align="right">Stock final</TableHeaderCell>
            <TableHeaderCell>Razon</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {movements.length === 0 ? (
            <TableEmptyRow colSpan={5}>Sin movimientos registrados</TableEmptyRow>
        ) : (
          movements.map((movement) => (
              <TableRow key={movement.id} tone={movement.quantity_delta < 0 ? "danger" : "success"}>
                <TableCell>{formatDate(movement.created_at)}</TableCell>
                <TableCell>{movement.movement_type}</TableCell>
                <TableCell
                  align="right"
                  className={`font-semibold ${movement.quantity_delta >= 0 ? "text-status-success" : "text-status-danger"}`}
                >
                  {movement.quantity_delta > 0 ? "+" : ""}
                  {movement.quantity_delta}
                </TableCell>
                <TableCell align="right">{movement.stock_after}</TableCell>
                <TableCell>
                  <TableText>{movement.reason ?? "Sin razon"}</TableText>
                </TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
