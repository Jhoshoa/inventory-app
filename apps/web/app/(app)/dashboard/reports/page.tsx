import Link from "next/link";
import { Activity } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSalesReport } from "@/features/reports/api";
import { DateRangeFilter } from "@/features/reports/components/DateRangeFilter";
import { ExportPanel } from "@/features/reports/components/ExportPanel";
import { PaymentMethodBreakdown } from "@/features/reports/components/PaymentMethodBreakdown";
import { SalesReportSummary } from "@/features/reports/components/SalesReportSummary";
import { TopProductsTable } from "@/features/reports/components/TopProductsTable";
import { parseReportSearchParams } from "@/features/reports/schemas";
import { canViewCashMovements, canViewStoreDayReports } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = parseReportSearchParams(rawParams);
  const [session, report] = await Promise.all([
    requireSession(),
    getSalesReport(params),
  ]);

  return (
    <PageSection className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Ventas, productos destacados y exportes administrativos."
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/dashboard/reports/stock-movements">
                <Activity className="h-4 w-4" aria-hidden />
                Movimientos de stock
              </Link>
            </Button>
            {canViewStoreDayReports(session.role) ? (
              <Button variant="secondary" asChild>
                <Link href="/dashboard/reports/store-days">Cierres diarios</Link>
              </Button>
            ) : null}
            {canViewCashMovements(session.role) ? (
              <Button variant="secondary" asChild>
                <Link href="/dashboard/reports/cash-movements">Movimientos de caja</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <DateRangeFilter params={params} />

      {!report.ok ? (
        <Alert variant="error">
          No se pudo cargar el reporte: {report.error.message}
        </Alert>
      ) : report.data.sales_count === 0 ? (
        <>
          <SalesReportSummary report={report.data} />
          <EmptyState
            title="Sin ventas para este rango"
            description="Cambia el rango de fechas o registra ventas desde POS para ver metricas."
          />
        </>
      ) : (
        <>
          <SalesReportSummary report={report.data} />
          <div className="grid gap-6 xl:grid-cols-2">
            <PaymentMethodBreakdown
              methods={report.data.by_payment_method}
              totalSales={report.data.total_sales}
            />
            <TopProductsTable products={report.data.top_products} />
          </div>
        </>
      )}

      <ExportPanel role={session.role} reportParams={params} />
    </PageSection>
  );
}
