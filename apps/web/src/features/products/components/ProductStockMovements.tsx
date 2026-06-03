import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
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
      <Table>
        <thead>
          <tr>
            <TableHeaderCell>Fecha</TableHeaderCell>
            <TableHeaderCell>Tipo</TableHeaderCell>
            <TableHeaderCell>Delta</TableHeaderCell>
            <TableHeaderCell>Stock final</TableHeaderCell>
            <TableHeaderCell>Razon</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {movements.length === 0 ? (
            <TableEmptyRow colSpan={5}>Sin movimientos registrados</TableEmptyRow>
          ) : (
            movements.map((movement) => (
              <tr key={movement.id} className="border-t border-app-border">
                <TableCell>{formatDate(movement.created_at)}</TableCell>
                <TableCell>{movement.movement_type}</TableCell>
                <TableCell>{movement.quantity_delta}</TableCell>
                <TableCell>{movement.stock_after}</TableCell>
                <TableCell>{movement.reason ?? "Sin razon"}</TableCell>
              </tr>
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
