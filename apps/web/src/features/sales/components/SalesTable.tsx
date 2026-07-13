import Link from "next/link";
import { Eye, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
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
    <Table density="compact" mobile="cards">
      <thead>
        <tr>
          <TableHeaderCell>Fecha</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell>Metodo</TableHeaderCell>
          <TableHeaderCell align="right">Artículos</TableHeaderCell>
          <TableHeaderCell align="right">Total</TableHeaderCell>
          <TableHeaderCell align="right">Acciones</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {sales.length === 0 ? (
          <TableEmptyRow colSpan={6}>
            <EmptyState
              icon={ReceiptText}
              title="Sin ventas registradas"
              description="Cuando confirmes ventas desde el POS, apareceran aqui para consulta y anulacion."
              action={
                <Button asChild>
                  <Link href="/dashboard/pos">Ir al POS</Link>
                </Button>
              }
              className="border-0 bg-transparent py-6 shadow-none"
            />
          </TableEmptyRow>
        ) : (
          sales.map((sale) => (
            <TableRow key={sale.id} tone={sale.status === "voided" ? "muted" : "default"}>
              <TableCell mobileLabel="Fecha">{formatDate(sale.created_at)}</TableCell>
              <TableCell mobileLabel="Estado">
                <SaleStatusBadge status={sale.status} />
              </TableCell>
              <TableCell mobileLabel="Metodo">{sale.payment_method}</TableCell>
              <TableCell align="right" mobileLabel="Artículos">{sale.items.length}</TableCell>
              <TableCell align="right" mobileLabel="Total" className="font-semibold text-text-strong">
                {formatCurrency(sale.total)}
              </TableCell>
              <TableCell align="right" mobileLabel="Acciones">
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
