import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import { SaleStatusBadge } from "./SaleStatusBadge";
import type { Sale } from "../types";

export function SalesTable({ sales }: { sales: Sale[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>Fecha</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell>Metodo</TableHeaderCell>
          <TableHeaderCell>Items</TableHeaderCell>
          <TableHeaderCell>Total</TableHeaderCell>
          <TableHeaderCell>Acciones</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {sales.length === 0 ? (
          <TableEmptyRow colSpan={6}>Sin ventas registradas</TableEmptyRow>
        ) : (
          sales.map((sale) => (
            <tr key={sale.id} className="border-t border-app-border hover:bg-app-surface-muted">
              <TableCell>{formatDate(sale.created_at)}</TableCell>
              <TableCell>
                <SaleStatusBadge status={sale.status} />
              </TableCell>
              <TableCell>{sale.payment_method}</TableCell>
              <TableCell>{sale.items.length}</TableCell>
              <TableCell>{formatCurrency(sale.total)}</TableCell>
              <TableCell>
                <Tooltip content="Ver venta">
                  <Button variant="icon" asChild>
                    <Link href={`/dashboard/sales/${sale.id}`} aria-label="Ver venta">
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </Tooltip>
              </TableCell>
            </tr>
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
