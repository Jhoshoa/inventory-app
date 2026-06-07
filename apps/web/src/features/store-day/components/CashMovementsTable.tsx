import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
  TableText,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import type { CashMovement } from "../types";

export function CashMovementsTable({ items }: { items: CashMovement[] }) {
  return (
    <Table density="compact">
      <thead>
        <tr>
          <TableHeaderCell>Fecha</TableHeaderCell>
          <TableHeaderCell>Tipo</TableHeaderCell>
          <TableHeaderCell align="right">Monto</TableHeaderCell>
          <TableHeaderCell>Nota</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <TableEmptyRow colSpan={4}>Sin movimientos</TableEmptyRow>
        ) : (
          items.map((item) => (
            <TableRow key={item.id} tone={item.direction === "out" ? "warning" : "success"}>
              <TableCell>{formatDateTime(item.occurred_at)}</TableCell>
              <TableCell>{cashMovementLabel(item.movement_type)}</TableCell>
              <TableCell
                align="right"
                className={`font-semibold ${item.direction === "in" ? "text-status-success" : "text-status-danger"}`}
              >
                {item.direction === "in" ? "+" : "-"}{formatCurrency(item.amount)}
              </TableCell>
              <TableCell>
                <TableText>{item.note ?? "Sin nota"}</TableText>
              </TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}

export function cashMovementLabel(type: string) {
  const labels: Record<string, string> = {
    cash_in: "Entrada",
    cash_out: "Salida",
    expense: "Gasto",
    deposit: "Deposito",
    withdrawal: "Retiro",
  };
  return labels[type] ?? type;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
