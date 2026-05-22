import Link from "next/link";
import { AlertTriangle, Boxes, ReceiptText, TrendingUp } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import type { UserRole } from "@/lib/auth/types";
import { StoreDayStatusPanel } from "@/features/store-day/components/StoreDayStatusPanel";
import type { StoreDayResult } from "@/features/store-day/types";
import type { DashboardSale, DashboardSummaryResult } from "../types";

export function DashboardOverview({
  summary,
  storeDay,
  role = "cashier",
}: {
  summary: DashboardSummaryResult;
  storeDay?: StoreDayResult;
  role?: UserRole;
}) {
  if (!summary.ok) {
    return (
      <section className="space-y-6">
        <PageTitle />
        <Alert variant="error">
          No se pudo cargar el dashboard: {summary.error.message}
        </Alert>
      </section>
    );
  }

  const data = summary.data;
  const isEmpty =
    data.products_total === 0 &&
    data.sales_today_count === 0 &&
    data.latest_sales.length === 0;

  return (
    <section className="space-y-6">
      <PageTitle />
      {storeDay ? <StoreDaySection storeDay={storeDay} role={role} /> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ventas hoy"
          value={formatCurrency(data.sales_today_total)}
          icon={TrendingUp}
        />
        <MetricCard
          label="Cantidad ventas"
          value={data.sales_today_count.toString()}
          icon={ReceiptText}
        />
        <MetricCard
          label="Productos"
          value={data.products_total.toString()}
          icon={Boxes}
        />
        <MetricCard
          label="Stock bajo"
          value={data.low_stock_count.toString()}
          icon={AlertTriangle}
          tone={data.low_stock_count > 0 ? "warning" : "default"}
        />
      </div>

      {isEmpty ? (
        <EmptyState
          title="Tu tienda aun no tiene actividad"
          description="Agrega productos para comenzar a vender y ver metricas reales del negocio."
          actionLabel="Ir a productos en Sprint 2"
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-950">
            Ultimas ventas
          </h2>
          <Table>
            <thead>
              <tr>
                <TableHeaderCell>Producto</TableHeaderCell>
                <TableHeaderCell>Cantidad</TableHeaderCell>
                <TableHeaderCell>Metodo</TableHeaderCell>
                <TableHeaderCell>Total</TableHeaderCell>
                <TableHeaderCell>Fecha</TableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {data.latest_sales.length === 0 ? (
                <TableEmptyRow colSpan={5}>Sin ventas recientes</TableEmptyRow>
              ) : (
                data.latest_sales.map((sale) => (
                  <tr key={sale.id} className="border-t border-slate-100">
                    <TableCell>{formatSaleProducts(sale)}</TableCell>
                    <TableCell>{saleQuantity(sale)}</TableCell>
                    <TableCell>{sale.payment_method ?? "Sin metodo"}</TableCell>
                    <TableCell>{formatCurrency(sale.total)}</TableCell>
                    <TableCell>
                      {sale.created_at ? formatDate(sale.created_at) : "Sin fecha"}
                    </TableCell>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">
              Productos con stock bajo
            </h2>
            <Link
              href="/dashboard/products"
              className="text-sm font-medium text-slate-700 underline"
            >
              Ver productos
            </Link>
          </div>
          <Table>
            <thead>
              <tr>
                <TableHeaderCell>Producto</TableHeaderCell>
                <TableHeaderCell>Stock</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {data.low_stock_products.length === 0 ? (
                <TableEmptyRow colSpan={3}>Sin alertas de stock</TableEmptyRow>
              ) : (
                data.low_stock_products.map((product) => (
                  <tr key={product.id} className="border-t border-slate-100">
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>
                      <Badge variant={product.stock <= 0 ? "danger" : "warning"}>
                        {product.stock <= 0 ? "Sin stock" : "Bajo"}
                      </Badge>
                    </TableCell>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </section>
      </div>
    </section>
  );
}

function StoreDaySection({
  storeDay,
  role,
}: {
  storeDay: StoreDayResult;
  role: UserRole;
}) {
  if (!storeDay.ok) {
    return (
      <Alert variant="error">
        No se pudo cargar el estado de tienda: {storeDay.error.message}
      </Alert>
    );
  }

  return <StoreDayStatusPanel storeDay={storeDay.data} role={role} actions="link" />;
}

function formatSaleProducts(sale: DashboardSale) {
  if (!sale.items || sale.items.length === 0) return "Sin producto";

  return sale.items.map((item) => item.product_name).join(", ");
}

function saleQuantity(sale: DashboardSale) {
  if (!sale.items || sale.items.length === 0) return 0;

  return sale.items.reduce((total, item) => total + item.quantity, 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function PageTitle() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        Resumen operativo de ventas, productos y alertas de inventario.
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <Icon
          className={`h-4 w-4 ${
            tone === "warning" ? "text-amber-600" : "text-slate-400"
          }`}
          aria-hidden={true}
        />
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
