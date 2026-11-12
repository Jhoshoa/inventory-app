import Link from "next/link";
import { ArrowDown, ArrowUp, BarChart3, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format/currency";
import type { UserRole } from "@/lib/auth/types";
import { paymentLabel } from "@/features/sales/list";
import { averageTicket } from "../schemas";
import { sectionHref, visibleSections } from "../sections";
import type { ReportSearchParams, SalesReport } from "../types";

export interface SalesComparison {
  percent: number;
  label: string;
}

const quantityFormatter = new Intl.NumberFormat("es-BO");

function dayMonth(date: string) {
  const [, month, day] = date.slice(0, 10).split("-");
  return `${day}/${month}`;
}

/** "Vendiste hoy", "Vendiste el 05/11", "Vendiste del 04 al 10/11". */
export function soldLabel(from: string, to: string, today: string) {
  if (from === to) return from === today ? "Vendiste hoy" : `Vendiste el ${dayMonth(from)}`;
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return `Vendiste del ${sameMonth ? from.slice(8, 10) : dayMonth(from)} al ${dayMonth(to)}`;
}

/**
 * Reportes › Ventas (tablero P08): vendido con la comparación, ventas y anuladas,
 * artículos, ticket promedio, cómo te pagaron (con cuántas ventas) y más vendidos.
 * En el celular, al pie, los accesos a las otras secciones.
 */
export function SalesOverview({
  report,
  comparison,
  voidedCount,
  params,
  role,
  today,
}: {
  report: SalesReport;
  comparison: SalesComparison | null;
  voidedCount: number | null;
  params: ReportSearchParams;
  role: UserRole;
  today: string;
}) {
  const total = Number(report.total_sales);
  const methods = report.by_payment_method.filter((method) => Number(method.total) > 0).sort((a, b) => Number(b.total) - Number(a.total));
  const links = visibleSections(role).filter((section) => section.key !== "ventas");
  const empty = report.sales_count === 0;

  return (
    <div className="flex flex-col gap-3">
      <section aria-label="Resumen de ventas" className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <div className="col-span-2 rounded-card border border-app-border bg-app-surface p-4 md:col-span-1">
          <p className="text-[13px] text-text-muted">
            <span className="md:hidden">{soldLabel(report.from_date, report.to_date, today)}</span>
            <span className="max-md:hidden">Vendido</span>
          </p>
          <p className="text-[26px] font-extrabold leading-tight tabular-nums text-text-strong">{formatCurrency(total)}</p>
          <p className="text-[13px] text-text-muted md:hidden">
            {report.sales_count === 1 ? "1 venta" : `${report.sales_count} ventas`} · {quantityFormatter.format(report.items_count)} artículos
          </p>
          {comparison ? <ComparisonLine comparison={comparison} /> : null}
        </div>
        <Kpi className="max-md:hidden" label="Ventas" value={quantityFormatter.format(report.sales_count)} hint={voidedText(voidedCount)} />
        <Kpi className="max-md:hidden" label="Artículos" value={quantityFormatter.format(report.items_count)} />
        <Kpi label="Ticket promedio" value={formatCurrency(averageTicket(report.total_sales, report.sales_count))} />
        <Kpi className="md:hidden" label="Anuladas" value={voidedCount === null ? "—" : quantityFormatter.format(voidedCount)} />
      </section>

      {empty ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-app-border bg-app-surface px-6 py-10 text-center">
          <BarChart3 className="h-8 w-8 text-text-muted" aria-hidden="true" />
          <p className="font-bold text-text-strong">Sin ventas en este rango</p>
          <p className="text-sm text-text-muted">Prueba con otras fechas o registra ventas en Vender.</p>
          <Button asChild variant="secondary" className="mt-1">
            <Link href="/dashboard/pos">Ir a Vender</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
          <section aria-labelledby="report-methods" className="rounded-card border border-app-border bg-app-surface p-4">
            <h2 id="report-methods" className="mb-3 text-[15px] font-bold text-text-strong">
              Cómo te pagaron
            </h2>
            <ul className="flex flex-col gap-3">
              {methods.map((method) => {
                const amount = Number(method.total);
                const share = total > 0 ? Math.round((amount / total) * 100) : 0;
                return (
                  <li key={method.payment_method}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-semibold text-text-strong">
                        {paymentLabel(method.payment_method)}{" "}
                        <span className="font-normal text-text-muted">· {method.count === 1 ? "1 venta" : `${method.count} ventas`}</span>
                      </span>
                      <strong className="tabular-nums text-text-strong">{formatCurrency(amount)}</strong>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-app-surface-muted" aria-hidden="true">
                      <div className="h-full rounded-full bg-brand-700" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="report-top" className="rounded-card border border-app-border bg-app-surface p-4">
            <h2 id="report-top" className="mb-2 text-[15px] font-bold text-text-strong">
              Más vendidos
            </h2>
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold text-text-muted max-md:sr-only">
                <tr>
                  <th scope="col" className="py-1.5">Producto</th>
                  <th scope="col" className="whitespace-nowrap py-1.5 pl-3 text-right">Unidades</th>
                  <th scope="col" className="whitespace-nowrap py-1.5 pl-3 text-right">Vendido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {report.top_products.map((product, index) => (
                  <tr key={product.product_id} className={index >= 5 ? "max-md:hidden" : ""}>
                    <td className="w-full max-w-0 truncate py-2 font-semibold text-text-strong">
                      <span className="text-text-muted md:hidden">{index + 1}. </span>
                      {product.product_name}
                    </td>
                    <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums text-text-body">
                      {quantityFormatter.format(product.quantity)}
                      <span className="md:hidden"> u.</span>
                    </td>
                    <td className="whitespace-nowrap py-2 pl-3 text-right font-bold tabular-nums text-text-strong">{formatCurrency(product.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {links.length > 0 ? (
        <nav aria-label="Más reportes" className="md:hidden">
          <ul className="divide-y divide-app-border overflow-hidden rounded-card border border-app-border bg-app-surface">
            {links.map((section) => (
              <li key={section.key}>
                <Link href={sectionHref(section.key, params)} className="flex min-h-[52px] items-center justify-between px-4 text-[15px] font-semibold text-text-strong hover:bg-app-surface-muted">
                  {section.key === "descargas" ? "Descargar en CSV" : section.label}
                  <ChevronRight className="h-5 w-5 text-text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

function voidedText(count: number | null) {
  if (count === null) return undefined;
  if (count === 0) return "Ninguna anulada";
  return count === 1 ? "1 anulada" : `${count} anuladas`;
}

function Kpi({ label, value, hint, className = "" }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className={`rounded-card border border-app-border bg-app-surface p-4 ${className}`}>
      <p className="text-[13px] text-text-muted">{label}</p>
      <p className="text-xl font-extrabold tabular-nums text-text-strong md:text-[26px] md:leading-tight">{value}</p>
      {hint ? <p className="text-[13px] text-text-muted">{hint}</p> : null}
    </div>
  );
}

function ComparisonLine({ comparison }: { comparison: SalesComparison }) {
  const up = comparison.percent > 0;
  const flat = comparison.percent === 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <p className={`mt-0.5 flex items-center gap-1 text-[13px] font-semibold ${flat ? "text-text-muted" : up ? "text-status-success" : "text-status-warning"}`}>
      {flat ? null : <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {flat ? null : <span className="sr-only">{up ? "Subió" : "Bajó"}</span>}
      {flat ? "Igual" : `${Math.abs(comparison.percent)}%`} {comparison.label}
    </p>
  );
}
