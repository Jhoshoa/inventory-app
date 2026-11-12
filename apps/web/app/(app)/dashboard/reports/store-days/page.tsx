import type { Metadata } from "next";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { Pagination } from "@/components/ui/Pagination";
import { ClosingsBrowser } from "@/features/reports/components/ClosingsBrowser";
import { ReportsHeader, firstDayNote } from "@/features/reports/components/ReportsHeader";
import { buildReportQueryString, parseReportSearchParams } from "@/features/reports/schemas";
import { listCloseReports } from "@/features/store-day/api";
import { listUsers } from "@/features/users/api";
import { canViewStoreDayReports } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Cierres de caja" };

const LIMIT = 50;

// Reportes › Cierres de caja (tablero P08, solo el dueño). La API recorta el rango al primer día.
export default async function StoreDayReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  if (!canViewStoreDayReports(session.role)) {
    return <ForbiddenState description="Solo el dueño de la tienda puede ver los cierres de caja." />;
  }

  const raw = await searchParams;
  const params = parseReportSearchParams(raw);
  const offset = Math.max(Number(raw.offset) || 0, 0);
  const [reports, users] = await Promise.all([
    listCloseReports({ from_date: params.from, to_date: params.to, limit: LIMIT, offset }),
    listUsers(100, 0),
  ]);
  const names = users.ok ? Object.fromEntries(users.data.items.map((user) => [user.id, user.full_name || user.email.split("@")[0]])) : {};

  return (
    <div className="flex flex-col gap-3">
      <ReportsHeader
        section="cierres"
        role={session.role}
        params={params}
        firstDayNote={reports.ok ? firstDayNote(params.from, reports.data.from_date) : null}
      />
      {!reports.ok ? (
        <DataFetchError resource="los cierres" error={reports.error.message} />
      ) : reports.data.items.length === 0 ? (
        <p className="rounded-card border border-app-border bg-app-surface px-4 py-8 text-center text-sm text-text-muted">
          Sin cierres en estas fechas. Los cierres aparecen cuando cierras la caja al final del día.
        </p>
      ) : (
        <>
          <ClosingsBrowser reports={reports.data.items} names={names} />
          {reports.data.total > reports.data.limit ? (
            <Pagination
              basePath="/dashboard/reports/store-days"
              searchParams={new URLSearchParams(buildReportQueryString(params))}
              total={reports.data.total}
              limit={reports.data.limit}
              offset={reports.data.offset}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
