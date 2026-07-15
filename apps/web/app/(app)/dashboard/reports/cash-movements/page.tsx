import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { EmptyState } from "@/components/ui/EmptyState";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { Pagination } from "@/components/ui/Pagination";
import { listCashMovements } from "@/features/store-day/api";
import { CashMovementsReportControls } from "@/features/store-day/components/CashMovementsReportControls";
import { CashMovementsTable } from "@/features/store-day/components/CashMovementsTable";
import { canViewCashMovements } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

const DEFAULT_LIMIT = 50;

export default async function CashMovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  if (!canViewCashMovements(session.role)) {
    return <ForbiddenState description="Movimientos de caja requiere permisos de owner." />;
  }

  const rawParams = await searchParams;
  const params = parseParams(rawParams);
  const movements = await listCashMovements(params);

  return (
    <PageSection className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Reportes", href: "/dashboard/reports" },
              { label: "Movimientos de caja" },
            ]}
          />
        }
        title="Movimientos de caja"
        description="Entradas, gastos, depositos y retiros operativos por jornada."
      />

      <CashMovementsReportControls params={params} />

      {!movements.ok ? (
        <DataFetchError resource="los movimientos" error={movements.error.message} />
      ) : movements.data.total === 0 ? (
        <EmptyState
          title="Sin movimientos de caja"
          description="Registra movimientos desde Ajustes cuando la tienda este abierta."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-panel">
          <CashMovementsTable items={movements.data.items} />
          <Pagination
            basePath="/dashboard/reports/cash-movements"
            searchParams={new URLSearchParams(rawParamsToStringEntries(rawParams))}
            total={movements.data.total}
            limit={movements.data.limit}
            offset={movements.data.offset}
          />
        </div>
      )}
    </PageSection>
  );
}

function parseParams(searchParams: Record<string, string | string[] | undefined>) {
  return {
    from_date: first(searchParams.from_date),
    to_date: first(searchParams.to_date),
    type: first(searchParams.type) ?? "all",
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

function rawParamsToStringEntries(params: Record<string, string | string[] | undefined>): [string, string][] {
  return Object.entries(params).flatMap(([key, value]) => {
    if (!value) return [];
    const firstValue = Array.isArray(value) ? value[0] : value;
    return firstValue ? [[key, firstValue]] : [];
  });
}
