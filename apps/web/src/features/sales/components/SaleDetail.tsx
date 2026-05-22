import { SummaryRow } from "@/components/ui/SummaryRow";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import { canVoidSale } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { SaleStatusBadge } from "./SaleStatusBadge";
import { VoidSaleDialog } from "./VoidSaleDialog";
import type { Sale } from "../types";

export function SaleDetail({ sale, role }: { sale: Sale; role: UserRole }) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-950">
              Venta {sale.id.slice(0, 8)}
            </h1>
            <SaleStatusBadge status={sale.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {formatDate(sale.created_at)} - {sale.payment_method}
          </p>
        </div>
        {sale.status === "completed" && canVoidSale(role) ? <VoidSaleDialog saleId={sale.id} /> : null}
      </div>

      {sale.status === "voided" ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Anulada {sale.voided_at ? formatDate(sale.voided_at) : ""}:{" "}
          {sale.void_reason ?? "Sin razon registrada"}
        </div>
      ) : null}

      <Table>
        <thead>
          <tr>
            <TableHeaderCell>Producto</TableHeaderCell>
            <TableHeaderCell>Cantidad</TableHeaderCell>
            <TableHeaderCell>Precio</TableHeaderCell>
            <TableHeaderCell>Subtotal</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {sale.items.length === 0 ? (
            <TableEmptyRow colSpan={4}>Sin items</TableEmptyRow>
          ) : (
            sale.items.map((item) => (
              <tr key={item.product_id} className="border-t border-slate-100">
                <TableCell>{item.product_name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                <TableCell>{formatCurrency(item.subtotal)}</TableCell>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <div className="ml-auto w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4">
        <SummaryRow label="Total" value={formatCurrency(sale.total)} strong />
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
