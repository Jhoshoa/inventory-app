import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  PackagePlus,
  PackageCheck,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
  TableText,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import { formatDateTimeShort, formatBusinessDate } from "@/lib/format/datetime";
import type { UserRole } from "@/lib/auth/types";
import { StoreDayStatusPanel } from "@/features/store-day/components/StoreDayStatusPanel";
import type { StoreDayResult } from "@/features/store-day/types";
import { DashboardScopeTabs } from "./DashboardScopeTabs";
import type {
  DashboardExchangeRate,
  DashboardSale,
  DashboardScope,
  DashboardSummary,
  DashboardSummaryResult,
} from "../types";

export function DashboardOverview({
  summary,
  storeDay,
  role = "cashier",
  scope = "today",
}: {
  summary: DashboardSummaryResult;
  storeDay?: StoreDayResult;
  role?: UserRole;
  scope?: DashboardScope;
}) {
  if (!summary.ok) {
    return (
      <PageSection>
        <DashboardHeader scope={scope} />
        <DataFetchError resource="el dashboard" error={summary.error.message} />
      </PageSection>
    );
  }

  const data = summary.data;
  const isEmpty =
    data.products_total === 0 &&
    data.sales_today_count === 0 &&
    data.latest_sales.length === 0;

  return (
    <PageSection className="space-y-6">
      <DashboardHeader scope={scope} />
      {storeDay ? <StoreDaySection storeDay={storeDay} role={role} /> : null}

      <MetricGrid data={data} />

      {isEmpty ? (
        <EmptyState
          icon={PackagePlus}
          title="Tu tienda aún no tiene actividad"
          description="Agrega productos para comenzar a vender y ver métricas reales del negocio."
          actionLabel="Ir a productos"
          actionHref="/dashboard/products"
        />
      ) : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
        <LatestSalesPanel sales={data.latest_sales} />
        <div className="min-w-0 space-y-6">
          <LowStockPanel data={data} />
          <ExchangeRatesPanel rates={data.exchange_rates} />
        </div>
      </div>
    </PageSection>
  );
}

function DashboardHeader({
  scope,
}: {
  scope: DashboardScope;
}) {
  return (
    <PageHeader
      eyebrow="Operación"
      title="Dashboard"
      description="Resumen operativo de ventas, productos y alertas de inventario."
      actions={<DashboardScopeTabs scope={scope} />}
    />
  );
}

function MetricGrid({ data }: { data: DashboardSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label={data.scope === "month" ? "Ventas del mes" : "Ventas hoy"}
        value={formatCurrency(data.sales_today_total)}
        helper={periodLabel(data)}
        icon={TrendingUp}
        tone="brand"
      />
      <MetricCard
        label="Cantidad ventas"
        value={data.sales_today_count.toString()}
        helper={data.sales_today_count === 1 ? "Ticket registrado" : "Tickets registrados"}
        icon={ReceiptText}
      />
      <MetricCard
        label="Productos"
        value={data.products_total.toString()}
        helper={`${data.out_of_stock_count} sin stock`}
        icon={Boxes}
        tone={data.out_of_stock_count > 0 ? "warning" : "default"}
      />
      <MetricCard
        label="Stock bajo"
        value={data.low_stock_count.toString()}
        helper={data.low_stock_count > 0 ? "Requiere reposición" : "Inventario estable"}
        icon={AlertTriangle}
        tone={data.low_stock_count > 0 ? "warning" : "success"}
      />
    </div>
  );
}

function LatestSalesPanel({ sales }: { sales: DashboardSale[] }) {
  return (
    <section className="min-w-0 space-y-3">
      <SectionHeading
        title="Últimas ventas"
        description="Actividad reciente del punto de venta."
        icon={ReceiptText}
      />
      <Table density="compact">
        <thead>
          <tr>
            <TableHeaderCell>Producto</TableHeaderCell>
            <TableHeaderCell align="right">Cantidad</TableHeaderCell>
            <TableHeaderCell>Método</TableHeaderCell>
            <TableHeaderCell align="right">Total</TableHeaderCell>
            <TableHeaderCell>Fecha</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {sales.length === 0 ? (
            <TableEmptyRow colSpan={5}>Sin ventas recientes</TableEmptyRow>
          ) : (
            sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>
                  <TableText className="min-w-52 font-medium text-text-strong">
                    {formatSaleProducts(sale)}
                  </TableText>
                </TableCell>
                <TableCell align="right">{saleQuantity(sale)}</TableCell>
                <TableCell>{sale.payment_method ?? "Sin método"}</TableCell>
                <TableCell align="right" className="font-semibold text-text-strong">
                  {formatCurrency(sale.total)}
                </TableCell>
                <TableCell>
                  {sale.created_at ? formatDateTimeShort(sale.created_at) : "Sin fecha"}
                </TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>
    </section>
  );
}

function LowStockPanel({ data }: { data: DashboardSummary }) {
  return (
    <section className="min-w-0 space-y-3">
      <SectionHeading
        title="Stock bajo"
        description={`${data.low_stock_count} productos bajo mínimo`}
        icon={PackageCheck}
        action={
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Ver productos
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />
      <Table density="compact">
        <thead>
          <tr>
            <TableHeaderCell>Producto</TableHeaderCell>
            <TableHeaderCell align="right">Stock</TableHeaderCell>
            <TableHeaderCell>Estado</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {data.low_stock_products.length === 0 ? (
            <TableEmptyRow colSpan={3}>Sin alertas de stock</TableEmptyRow>
          ) : (
            data.low_stock_products.map((product) => (
              <TableRow key={product.id} tone={product.stock <= 0 ? "danger" : "warning"}>
                <TableCell>
                  <TableText className="font-medium text-text-strong">{product.name}</TableText>
                </TableCell>
                <TableCell align="right">{product.stock}</TableCell>
                <TableCell>
                  <Badge variant={product.stock <= 0 ? "danger" : "warning"}>
                    {product.stock <= 0 ? "Sin stock" : "Bajo"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>
    </section>
  );
}

function ExchangeRatesPanel({ rates }: { rates: DashboardExchangeRate[] }) {
  return (
    <section className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
      <SectionHeading
        title="Tasas"
        description="Referencia disponible para operaciones."
        icon={CircleDollarSign}
      />
      {rates.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">Sin tasas registradas.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {rates.map((rate, index) => (
            <div
              key={exchangeRateKey(rate, index)}
              className="flex items-center justify-between gap-3 rounded-md border border-app-border bg-app-surface-muted px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-text-strong">{rate.source}</p>
                <p className="text-xs text-text-muted">Compra / venta</p>
              </div>
              <p className="text-sm font-semibold text-text-strong">
                {rate.buy_price ?? "N/A"} / {rate.sell_price ?? "N/A"}
              </p>
            </div>
          ))}
        </div>
      )}
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
      <DataFetchError resource="el estado de tienda" error={storeDay.error.message} />
    );
  }

  return <StoreDayStatusPanel storeDay={storeDay.data} role={role} actions="link" />;
}

function exchangeRateKey(rate: DashboardExchangeRate, index: number) {
  return rate.id || `${rate.source}-${rate.buy_price ?? "buy"}-${rate.sell_price ?? "sell"}-${index}`;
}

function formatSaleProducts(sale: DashboardSale) {
  if (!sale.items || sale.items.length === 0) return "Sin producto";

  return sale.items.map((item) => item.product_name).join(", ");
}

function saleQuantity(sale: DashboardSale) {
  if (!sale.items || sale.items.length === 0) return 0;

  return sale.items.reduce((total, item) => total + item.quantity, 0);
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone?: "brand" | "default" | "success" | "warning";
}) {
  const toneClasses = {
    brand: "border-brand-100 bg-brand-50 text-brand-700",
    default: "border-app-border bg-app-surface-muted text-text-muted",
    success: "border-status-successBorder bg-status-successBg text-status-success",
    warning: "border-status-warningBorder bg-status-warningBg text-status-warning",
  }[tone];

  return (
    <div className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text-muted">{label}</p>
        <Icon
          className={`h-9 w-9 rounded-md border p-2 ${toneClasses}`}
          aria-hidden={true}
        />
      </div>
      <p className="mt-3 text-2xl font-semibold text-text-strong">{value}</p>
      <p className="mt-1 text-xs text-text-muted">{helper}</p>
    </div>
  );
}

function SectionHeading({
  action,
  description,
  icon: Icon,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-text-muted" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-strong">{title}</h2>
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function periodLabel(data: DashboardSummary) {
  if (!data.from_date || !data.to_date) {
    return data.scope === "month" ? "Mes actual" : "Jornada actual";
  }

  if (data.from_date === data.to_date) {
    return formatBusinessDate(data.from_date);
  }

  return `${formatBusinessDate(data.from_date)} - ${formatBusinessDate(data.to_date)}`;
}
