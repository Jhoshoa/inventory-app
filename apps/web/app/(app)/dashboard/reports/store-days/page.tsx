import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { Pagination } from "@/components/ui/Pagination";
import { listCloseReports } from "@/features/store-day/api";
import { StoreDayCloseReportsTable } from "@/features/store-day/components/StoreDayCloseReportsTable";
import { StoreDayReportsDateFilter } from "@/features/store-day/components/StoreDayReportsDateFilter";
import { canViewStoreDayReports } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

const DEFAULT_LIMIT = 50;

export default async function StoreDayReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  if (!canViewStoreDayReports(session.role)) {
    return <ForbiddenState description="Cierres diarios requiere permisos de owner." />;
  }

  const rawParams = await searchParams;
  const params = parseParams(rawParams);
  const reports = await listCloseReports(params);

  return (
    <PageSection className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Reportes", href: "/dashboard/reports" },
              { label: "Cierres diarios" },
            ]}
          />
        }
        title="Cierres diarios"
        description="Historial de cierres operativos y diferencias de caja."
      />

      <StoreDayReportsDateFilter fromDate={params.from_date} toDate={params.to_date} />

      {!reports.ok ? (
        <DataFetchError resource="los cierres" error={reports.error.message} />
      ) : (
        <>
          <StoreDayCloseReportsTable items={reports.data.items} />
          <Pagination
            basePath="/dashboard/reports/store-days"
            searchParams={new URLSearchParams(rawParamsToStringEntries(rawParams))}
            total={reports.data.total}
            limit={reports.data.limit}
            offset={reports.data.offset}
          />
        </>
      )}
    </PageSection>
  );
}

function parseParams(searchParams: Record<string, string | string[] | undefined>) {
  return {
    from_date: first(searchParams.from_date),
    to_date: first(searchParams.to_date),
    limit: parseIntParam(first(searchParams.limit), DEFAULT_LIMIT),
    offset: parseIntParam(first(searchParams.offset), 0),
  };
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseIntParam(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function rawParamsToStringEntries(
  params: Record<string, string | string[] | undefined>,
): [string, string][] {
  return Object.entries(params).flatMap(([key, value]) => {
    if (!value) return [];
    const firstValue = Array.isArray(value) ? value[0] : value;
    return firstValue ? [[key, firstValue]] : [];
  });
}

