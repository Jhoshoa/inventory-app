import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
} from "@/components/ui/Table";
import type { StockMovement } from "../types";

export function StockMovementsTable({ movements }: { movements: StockMovement[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>Fecha</TableHeaderCell>
          <TableHeaderCell>Tipo</TableHeaderCell>
          <TableHeaderCell>Producto</TableHeaderCell>
          <TableHeaderCell>Delta</TableHeaderCell>
          <TableHeaderCell>Stock</TableHeaderCell>
          <TableHeaderCell>Razon</TableHeaderCell>
          <TableHeaderCell>Venta</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {movements.length === 0 ? (
          <TableEmptyRow colSpan={7}>Sin movimientos para este filtro</TableEmptyRow>
        ) : (
          movements.map((movement) => (
            <tr key={movement.id} className="border-t border-app-border">
              <TableCell>{formatDate(movement.created_at)}</TableCell>
              <TableCell>
                <Badge variant={badgeVariant(movement.movement_type)}>
                  {movementTypeLabel(movement.movement_type)}
                </Badge>
              </TableCell>
              <TableCell>{shortId(movement.product_id)}</TableCell>
              <TableCell className={movement.quantity_delta >= 0 ? "text-status-success" : "text-status-danger"}>
                {movement.quantity_delta > 0 ? "+" : ""}
                {movement.quantity_delta}
              </TableCell>
              <TableCell>{movement.stock_after}</TableCell>
              <TableCell>{movement.reason ?? "Sin razon"}</TableCell>
              <TableCell>
                {movement.sale_id ? (
                  <Link className="font-medium text-brand-700 underline" href={`/dashboard/sales/${movement.sale_id}`}>
                    {shortId(movement.sale_id)}
                  </Link>
                ) : (
                  "N/A"
                )}
              </TableCell>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );
}

export function movementTypeLabel(type: string) {
  const labels: Record<string, string> = {
    sale: "Venta",
    sale_void: "Anulacion",
    manual_adjustment: "Ajuste",
    import: "Importacion",
    stock_movement: "Movimiento",
  };
  return labels[type] ?? type;
}

function badgeVariant(type: string) {
  if (type === "sale_void") return "warning";
  if (type === "sale") return "danger";
  return "default";
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
