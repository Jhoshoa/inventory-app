import Link from "next/link";
import { ArrowRight, CalendarClock, PackageMinus, PackagePlus, ShoppingBag } from "lucide-react";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ShellStatus } from "@/components/layout/shellStatus";
import type { Session } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/format/currency";
import { formatTimeShort } from "@/lib/format/datetime";
import type { SalesReport } from "@/features/reports/types";
import type { DashboardSale, DashboardSummary, DashboardSummaryResult } from "../types";
import {
  greeting,
  HOME_PERIODS,
  longDate,
  paymentMethodLabel,
  percentChange,
  timeAgo,
  type HomePeriod,
} from "../home";
import { HomeSearch } from "./HomeSearch";

export interface HomeData {
  period: HomePeriod;
  today: string;
  summary: DashboardSummaryResult;
  /** Totales del periodo (null si no se pudieron cargar: se muestra lo demás). */
  sales: SalesReport | null;
  previousSales: SalesReport | null;
  comparisonLabel: string;
  pendingOrders: { count: number; oldestAt: string | null } | null;
  cash: ShellStatus["cash"];
}

const SALES_LABEL: Record<HomePeriod, string> = {
  today: "Ventas de hoy",
  "7d": "Ventas de los últimos 7 días",
  month: "Ventas del mes",
};

/** Inicio (tableros "A · Inicio" celular y escritorio). */
export function HomeOverview({ session, data }: { session: Session; data: HomeData }) {
  const firstName = (session.fullName || "").split(" ")[0];

  return (
    <div className="flex flex-col gap-5">
      <PhoneStatusChips cash={data.cash} pendingOrders={data.pendingOrders?.count ?? null} />
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[13px] text-text-muted">{longDate(data.today)}</p>
          <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[28px]">Inicio</h1>
          <p className="text-sm text-text-muted">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="hidden sm:block">
            <HomeSearch />
          </div>
          <PeriodTabs period={data.period} />
        </div>
      </header>

      {!data.summary.ok ? (
        <DataFetchError resource="el resumen de Inicio" error={data.summary.error.message} />
      ) : (
        <HomeContent summary={data.summary.data} data={data} />
      )}
    </div>
  );
}

function HomeContent({ summary, data }: { summary: DashboardSummary; data: HomeData }) {
  if (summary.products_total === 0 && summary.sales_today_count === 0 && summary.latest_sales.length === 0) {
    return (
      <EmptyState
        icon={PackagePlus}
        title="Tu tienda todavía no tiene productos"
        description="Agrega tu primer producto (o impórtalos desde un CSV) para empezar a vender."
        actionLabel="Agregar productos"
        actionHref="/dashboard/products/new"
      />
    );
  }

  const count = summary.sales_today_count;
  const total = summary.sales_today_total;
  const average = count > 0 ? (Number(total) / count).toFixed(2) : null;
  const change = data.previousSales ? percentChange(total, data.previousSales.total_sales) : null;
  const pending = data.pendingOrders;

  return (
    <>
      <section aria-label="Resumen del periodo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-1.5 rounded-card bg-text-strong p-[18px] text-text-inverse lg:col-span-1">
          <span className="text-[13px] text-[#D0D5DD]">{SALES_LABEL[data.period]}</span>
          <strong className="text-[28px] font-extrabold tracking-tight">{formatCurrency(total)}</strong>
          <span className={`text-xs ${change?.direction === "down" ? "text-[#FECDCA]" : "text-[#A6F4C5]"}`}>
            {change
              ? `${change.direction === "up" ? "↑" : change.direction === "down" ? "↓" : "="} ${change.percent}% vs. ${data.comparisonLabel}`
              : `Sin ventas para comparar con ${data.comparisonLabel}`}
          </span>
        </div>
        <Kpi label="Tickets" value={String(count)} hint={average ? `Promedio ${formatCurrency(average)}` : "Sin ventas todavía"} />
        {/* items_count de la API cuenta productos distintos por venta, no unidades (decisión D8 del plan). */}
        <Kpi
          label="Productos vendidos"
          value={data.sales ? String(data.sales.items_count) : "—"}
          hint={data.sales ? `Distintos, en ${count} ${count === 1 ? "venta" : "ventas"}` : "No se pudo cargar"}
        />
        <Kpi
          label="Pedidos sin responder"
          value={pending ? String(pending.count) : "—"}
          hint={
            pending?.count && pending.oldestAt
              ? `El más antiguo ${timeAgo(pending.oldestAt)}`
              : pending
                ? "Nada pendiente"
                : "No se pudo cargar"
          }
          warn={Boolean(pending?.count)}
          href="/dashboard/solicitudes"
        />
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <PaymentBreakdown sales={data.sales} />
        <AttentionList summary={summary} pending={pending} />
      </div>

      <LatestSales sales={summary.latest_sales} />

      {summary.exchange_rates.length > 0 ? (
        <section aria-labelledby="tipo-cambio" className="rounded-card border border-app-border bg-app-surface p-[18px]">
          <h2 id="tipo-cambio" className="text-base font-bold text-text-strong">
            Tipo de cambio
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {summary.exchange_rates.map((rate, index) => (
              <li key={`${rate.id || rate.source}-${index}`} className="flex justify-between gap-3 text-sm">
                <span className="text-text-muted">{rate.source}</span>
                <span className="font-semibold text-text-strong">
                  {rate.buy_price ? `Compra ${rate.buy_price}` : ""}
                  {rate.buy_price && rate.sell_price ? " · " : ""}
                  {rate.sell_price ? `Venta ${rate.sell_price}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function PhoneStatusChips({ cash, pendingOrders }: { cash: ShellStatus["cash"]; pendingOrders: number | null }) {
  if (!cash && !pendingOrders) return null;
  return (
    <div className="flex flex-wrap gap-2 sm:hidden">
      {cash ? (
        <Link
          href="/dashboard/caja"
          className={`tap-area inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold ${
            cash.isOpen
              ? "border-status-successBorder bg-status-successBg text-status-success"
              : "border-app-borderStrong bg-app-surface text-text-body"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${cash.isOpen ? "bg-[#12B76A]" : "bg-app-borderStrong"}`} aria-hidden="true" />
          {cash.isOpen ? `Caja abierta${cash.openedAt ? ` desde ${formatTimeShort(cash.openedAt)}` : ""}` : "Caja cerrada"}
        </Link>
      ) : null}
      {pendingOrders ? (
        <Link
          href="/dashboard/solicitudes"
          className="tap-area inline-flex min-h-8 items-center rounded-full border border-status-warningBorder bg-status-warningBg px-3 text-xs font-bold text-status-warning"
        >
          {pendingOrders} {pendingOrders === 1 ? "pedido" : "pedidos"}
        </Link>
      ) : null}
    </div>
  );
}

function PeriodTabs({ period }: { period: HomePeriod }) {
  return (
    <nav aria-label="Periodo" className="flex self-start rounded-[10px] bg-[#EEF0F4] p-[3px]">
      {HOME_PERIODS.map((option) => {
        const active = option.value === period;
        return (
          <Link
            key={option.value}
            href={option.value === "today" ? "/dashboard" : `/dashboard?scope=${option.value}`}
            aria-current={active ? "page" : undefined}
            className={`tap-area rounded-lg px-3.5 py-2 text-[13px] font-semibold ${
              active ? "bg-app-surface text-text-strong shadow-sm" : "text-text-muted hover:text-text-strong"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Kpi({
  label,
  value,
  hint,
  warn = false,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
  href?: string;
}) {
  const body = (
    <>
      <span className="text-[13px] text-text-muted">{label}</span>
      <strong className="text-[26px] font-extrabold text-text-strong sm:text-[28px]">{value}</strong>
      <span className={`text-xs ${warn ? "font-semibold text-status-warning" : "text-text-muted"}`}>{hint}</span>
    </>
  );
  const className = "flex flex-col gap-1.5 rounded-card border border-app-border bg-app-surface p-[18px]";
  return href ? (
    <Link href={href} className={`${className} hover:border-app-borderStrong`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function PaymentBreakdown({ sales }: { sales: SalesReport | null }) {
  const methods = sales?.by_payment_method.filter((method) => Number(method.total) > 0) ?? [];
  const max = Math.max(...methods.map((method) => Number(method.total)), 0);
  return (
    <section aria-labelledby="como-pagaron" className="flex min-w-0 flex-col gap-3.5 rounded-card border border-app-border bg-app-surface p-[18px]">
      <h2 id="como-pagaron" className="text-base font-bold text-text-strong">
        Cómo te pagaron
      </h2>
      {!sales ? (
        <p className="text-sm text-text-muted">No se pudo cargar. Recarga la página para intentar de nuevo.</p>
      ) : methods.length === 0 ? (
        <p className="text-sm text-text-muted">Todavía no hay ventas en este periodo.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {methods.map((method, index) => (
            <li key={method.payment_method} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="font-semibold text-text-strong">
                  {paymentMethodLabel(method.payment_method)}{" "}
                  <span className="font-normal text-text-muted">
                    · {method.count} {method.count === 1 ? "venta" : "ventas"}
                  </span>
                </span>
                <span className="text-text-muted">{formatCurrency(method.total)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF0F4]" aria-hidden="true">
                <div
                  className={`h-2.5 rounded-full ${index === 0 ? "bg-brand-700" : "bg-[#84ADFF]"}`}
                  style={{ width: `${max > 0 ? Math.max(4, (Number(method.total) / max) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AttentionList({
  summary,
  pending,
}: {
  summary: DashboardSummary;
  pending: HomeData["pendingOrders"];
}) {
  const expiring = summary.expiring_batches_count ?? 0;
  const expired = summary.expired_batches_count ?? 0;
  const firstAlert = summary.expiry_alerts?.[0];
  const lowStock = summary.low_stock_count;
  const lowNames = summary.low_stock_products.map((product) => product.name);
  const items: Array<{ key: string; href: string; title: string; detail: string; action: string; tone: "warn" | "plain"; icon: typeof CalendarClock }> = [];

  if (expiring + expired > 0) {
    items.push({
      key: "lotes",
      href: "/dashboard/products?stock=expiring",
      title: [
        expiring ? `${expiring} ${expiring === 1 ? "lote por vencer" : "lotes por vencer"}` : null,
        expired ? `${expired} ${expired === 1 ? "vencido" : "vencidos"}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      detail: firstAlert ? `${firstAlert.product_name ?? "Producto"} · ${firstAlert.quantity_remaining} u.` : "Revísalos antes de que se pierdan",
      action: "Revisar",
      tone: "warn",
      icon: CalendarClock,
    });
  }
  if (lowStock > 0) {
    items.push({
      key: "stock",
      href: "/dashboard/products?stock=low",
      title: `${lowStock} ${lowStock === 1 ? "producto con stock bajo" : "productos con stock bajo"}`,
      detail:
        lowNames.length > 2
          ? `${lowNames.slice(0, 2).join(", ")} y ${lowStock - 2} más`
          : lowNames.join(" y ") || "Reponlos para no quedarte sin",
      action: "Reponer",
      tone: "plain",
      icon: PackageMinus,
    });
  }
  if (pending?.count) {
    items.push({
      key: "pedidos",
      href: "/dashboard/solicitudes",
      title: `${pending.count} ${pending.count === 1 ? "pedido del catálogo" : "pedidos del catálogo"}`,
      detail: pending.oldestAt ? `El más antiguo ${timeAgo(pending.oldestAt)}` : "Sin responder",
      action: "Responder",
      tone: "plain",
      icon: ShoppingBag,
    });
  }

  return (
    <section aria-labelledby="necesita-atencion" className="flex min-w-0 flex-col gap-3 rounded-card border border-app-border bg-app-surface p-[18px]">
      <h2 id="necesita-atencion" className="text-base font-bold text-text-strong">
        Necesita atención
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Todo en orden: sin lotes por vencer, sin stock bajo y sin pedidos pendientes.</p>
      ) : (
        items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-control border p-3 ${
                item.tone === "warn"
                  ? "border-status-warningBorder bg-status-warningBg"
                  : "border-app-border hover:bg-app-surface-muted"
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${item.tone === "warn" ? "text-status-warning" : "text-text-muted"}`} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <strong className="block text-sm text-text-strong">{item.title}</strong>
                <span className={`block truncate text-xs ${item.tone === "warn" ? "text-[#93370D]" : "text-text-muted"}`}>
                  {item.detail}
                </span>
              </span>
              <span className={`text-[13px] font-bold ${item.tone === "warn" ? "text-[#93370D]" : "text-brand-700"}`}>
                {item.action}
              </span>
            </Link>
          );
        })
      )}
    </section>
  );
}

function saleProducts(sale: DashboardSale) {
  const items = sale.items ?? [];
  if (items.length === 0) return "Venta";
  return items.map((item) => (item.quantity > 1 ? `${item.product_name} × ${item.quantity}` : item.product_name)).join(", ");
}

function LatestSales({ sales }: { sales: DashboardSale[] }) {
  return (
    <section aria-labelledby="ultimas-ventas" className="min-w-0 overflow-hidden rounded-card border border-app-border bg-app-surface">
      <div className="flex items-baseline justify-between px-[18px] py-4">
        <h2 id="ultimas-ventas" className="text-base font-bold text-text-strong">
          Últimas ventas
        </h2>
        <Link href="/dashboard/sales" className="tap-area inline-flex items-center gap-1 text-[13px] font-semibold text-brand-700">
          Ver todas <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      {sales.length === 0 ? (
        <p className="px-[18px] pb-5 text-sm text-text-muted">
          Todavía no hay ventas. Las que hagas en Vender aparecen aquí.
        </p>
      ) : (
        <ul className="divide-y divide-[#F2F4F7] border-t border-[#F2F4F7]">
          {sales.map((sale) => (
            <li key={sale.id}>
              <Link href={`/dashboard/sales/${sale.id}`} className="flex items-center gap-3 px-[18px] py-3 hover:bg-app-surface-muted">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-strong">{saleProducts(sale)}</span>
                  <span className="block text-xs text-text-muted">
                    {sale.created_at ? formatTimeShort(sale.created_at) : ""}
                    {sale.payment_method ? ` · ${paymentMethodLabel(sale.payment_method)}` : ""}
                    {sale.status === "voided" ? " · Anulada" : ""}
                  </span>
                </span>
                <strong className={`text-sm ${sale.status === "voided" ? "text-text-disabled line-through" : "text-text-strong"}`}>
                  {formatCurrency(sale.total)}
                </strong>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
