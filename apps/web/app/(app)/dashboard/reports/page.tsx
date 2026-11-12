import type { Metadata } from "next";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { getSalesReport } from "@/features/reports/api";
import { ReportsHeader, firstDayNote } from "@/features/reports/components/ReportsHeader";
import { SalesOverview, type SalesComparison } from "@/features/reports/components/SalesOverview";
import { comparisonLabel, parseReportSearchParams, percentChange, previousRange } from "@/features/reports/schemas";
import type { SalesReport } from "@/features/reports/types";
import { listSales } from "@/features/sales/api";
import { businessDateKey } from "@/features/sales/list";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reportes" };

// Reportes › Ventas (tablero P08). Rango en la dirección; la API recorta al primer día (E14).
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseReportSearchParams(await searchParams);
  const [session, report] = await Promise.all([requireSession(), getSalesReport(params)]);

  if (!report.ok) {
    const beforeOpening = report.error.status === 400;
    return (
      <div className="flex flex-col gap-3">
        <ReportsHeader section="ventas" role={session.role} params={params} />
        {beforeOpening ? (
          <p role="status" className="rounded-card border border-app-border bg-app-surface px-4 py-6 text-center text-sm text-text-muted">
            Tu tienda todavía no vendía en esas fechas. Elige un rango desde que abriste.
          </p>
        ) : (
          <DataFetchError resource="el reporte" error={report.error.message} />
        )}
      </div>
    );
  }

  const range = { from: report.data.from_date.slice(0, 10), to: report.data.to_date.slice(0, 10) };
  const [comparison, voided] = await Promise.all([
    loadComparison(report.data, range),
    listSales({ from_date: range.from, to_date: range.to, status: "voided", limit: 1, offset: 0 }),
  ]);

  return (
    <div className="flex flex-col gap-3">
      <ReportsHeader
        section="ventas"
        role={session.role}
        params={params}
        firstDayNote={firstDayNote(params.from, report.data.from_date)}
      />
      <SalesOverview
        report={report.data}
        comparison={comparison}
        voidedCount={voided.ok ? voided.data.total : null}
        params={params}
        role={session.role}
        today={businessDateKey()}
      />
    </div>
  );
}

/** Mismo largo justo antes; solo si la tienda ya vendía todo ese período (si no, no se compara). */
async function loadComparison(report: SalesReport, range: { from: string; to: string }): Promise<SalesComparison | null> {
  const previous = previousRange(range.from, range.to);
  if (report.first_business_date && previous.from < report.first_business_date) return null;
  const before = await getSalesReport({ range: "custom", ...previous });
  if (!before.ok) return null;
  const percent = percentChange(Number(report.total_sales), Number(before.data.total_sales));
  return percent === null ? null : { percent, label: comparisonLabel(range.from, range.to) };
}
