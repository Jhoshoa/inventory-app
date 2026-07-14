import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { SummaryRow } from "@/components/ui/SummaryRow";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
  TableText,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import { formatDateTimeShort } from "@/lib/format/datetime";
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
        description={`${formatDateTimeShort(sale.created_at)} - ${sale.payment_method}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SaleStatusBadge status={sale.status} />
            {sale.status === "completed" && canVoidSale(role) ? <VoidSaleDialog saleId={sale.id} /> : null}
          </div>
        }
      />

      {sale.status === "voided" ? (
        <div className="rounded-lg border border-status-dangerBorder bg-status-dangerBg p-4 text-sm text-status-danger">
          Anulada {sale.voided_at ? formatDateTimeShort(sale.voided_at) : ""}:{" "}
          {sale.void_reason ?? "Sin razon registrada"}
        </div>
      ) : null}

      <Table density="compact">
        <thead>
          <tr>
            <TableHeaderCell>Producto</TableHeaderCell>
            <TableHeaderCell align="right">Cantidad</TableHeaderCell>
            <TableHeaderCell align="right">Precio</TableHeaderCell>
            <TableHeaderCell align="right">Subtotal</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {sale.items.length === 0 ? (
            <TableEmptyRow colSpan={4}>Sin artículos</TableEmptyRow>
        ) : (
          sale.items.map((item) => (
              <TableRow key={item.product_id}>
                <TableCell>
                  <TableText className="font-medium text-text-strong">{item.product_name}</TableText>
                </TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                <TableCell align="right" className="font-semibold text-text-strong">
                  {formatCurrency(item.subtotal)}
                </TableCell>
              </TableRow>
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
