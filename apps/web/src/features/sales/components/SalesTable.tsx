import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  Table,
  TableActionGroup,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import { SaleStatusBadge } from "./SaleStatusBadge";
import type { Sale } from "../types";

export function SalesTable({ sales }: { sales: Sale[] }) {
  return (
    <Table density="compact">
      <thead>
        <tr>
          <TableHeaderCell>Fecha</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell>Metodo</TableHeaderCell>
          <TableHeaderCell align="right">Items</TableHeaderCell>
          <TableHeaderCell align="right">Total</TableHeaderCell>
          <TableHeaderCell align="right">Acciones</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {sales.length === 0 ? (
          <TableEmptyRow colSpan={6}>Sin ventas registradas</TableEmptyRow>
        ) : (
          sales.map((sale) => (
            <TableRow key={sale.id} tone={sale.status === "voided" ? "muted" : "default"}>
              <TableCell>{formatDate(sale.created_at)}</TableCell>
              <TableCell>
                <SaleStatusBadge status={sale.status} />
              </TableCell>
              <TableCell>{sale.payment_method}</TableCell>
              <TableCell align="right">{sale.items.length}</TableCell>
              <TableCell align="right" className="font-semibold text-text-strong">
                {formatCurrency(sale.total)}
              </TableCell>
              <TableCell align="right">
                <TableActionGroup>
                  <Tooltip content="Ver venta">
                    <Button variant="icon" asChild>
                      <Link href={`/dashboard/sales/${sale.id}`} aria-label="Ver venta">
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </Tooltip>
                </TableActionGroup>
              </TableCell>
            </TableRow>
          ))
        )}
      </tbody>
    </Table>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
