import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
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
    <PageSection className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Ventas", href: "/dashboard/sales" },
              { label: `Venta ${sale.id.slice(0, 8)}` },
            ]}
          />
        }
        title={`Venta ${sale.id.slice(0, 8)}`}
        description={`${formatDate(sale.created_at)} - ${sale.payment_method}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SaleStatusBadge status={sale.status} />
            {sale.status === "completed" && canVoidSale(role) ? <VoidSaleDialog saleId={sale.id} /> : null}
          </div>
        }
      />

      {sale.status === "voided" ? (
        <div className="rounded-lg border border-status-dangerBorder bg-status-dangerBg p-4 text-sm text-status-danger">
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
              <tr key={item.product_id} className="border-t border-app-border">
                <TableCell>{item.product_name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                <TableCell>{formatCurrency(item.subtotal)}</TableCell>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <div className="ml-auto w-full max-w-sm rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
        <SummaryRow label="Total" value={formatCurrency(sale.total)} strong />
      </div>
    </PageSection>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
