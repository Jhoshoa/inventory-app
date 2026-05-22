import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { StoreDayCloseReportView } from "@/features/store-day/components/StoreDayCloseReportView";
import { getCloseReport } from "@/features/store-day/api";
import { canViewStoreDayReports } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function StoreDayCloseReportPage({
  params,
}: {
  params: Promise<{ businessDayId: string }>;
}) {
  const session = await requireSession();
  if (!canViewStoreDayReports(session.role)) {
    return <ForbiddenState description="Reporte de cierre requiere permisos de owner." />;
  }

  const { businessDayId } = await params;
  const report = await getCloseReport(businessDayId);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Reporte de cierre</h1>
          <p className="mt-1 text-sm text-slate-600">
            Snapshot operativo de ventas y caja de la jornada.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/dashboard/reports/store-days">Ver cierres</Link>
        </Button>
      </div>

      <StoreDayCloseReportView report={report} />
    </section>
  );
}
