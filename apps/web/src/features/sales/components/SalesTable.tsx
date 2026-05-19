import Link from "next/link";
import { Button } from "@/components/ui/Button";
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
            <tr key={sale.id} className="border-t border-slate-100">
              <TableCell>{formatDate(sale.created_at)}</TableCell>
              <TableCell>
                <SaleStatusBadge status={sale.status} />
              </TableCell>
              <TableCell>{sale.payment_method}</TableCell>
              <TableCell>{sale.items.length}</TableCell>
              <TableCell>{formatCurrency(sale.total)}</TableCell>
              <TableCell>
                <Button variant="secondary" asChild>
                  <Link href={`/dashboard/sales/${sale.id}`}>Ver</Link>
                </Button>
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
