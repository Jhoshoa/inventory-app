import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { listStockMovements } from "@/features/reports/api";
import { ExportPanel } from "@/features/reports/components/ExportPanel";
import { StockMovementFilters } from "@/features/reports/components/StockMovementFilters";
import { StockMovementsTable } from "@/features/reports/components/StockMovementsTable";
import {
  buildStockMovementQueryString,
  parseStockMovementSearchParams,
} from "@/features/reports/schemas";
import { requireSession } from "@/lib/auth/session";

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = parseStockMovementSearchParams(rawParams);
  const [session, movements] = await Promise.all([
    requireSession(),
    listStockMovements(params),
  ]);
  const urlParams = new URLSearchParams(buildStockMovementQueryString(params));

  return (
    <PageSection className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Reportes", href: "/dashboard/reports" },
              { label: "Movimientos de stock" },
            ]}
          />
        }
        title="Movimientos de stock"
        description="Auditoria global de ventas, anulaciones y ajustes de inventario."
      />

      <StockMovementFilters params={params} />

      {!movements.ok ? (
        <Alert variant="error">
          No se pudieron cargar movimientos: {movements.error.message}
        </Alert>
      ) : movements.data.total === 0 ? (
        <EmptyState
          title="Sin movimientos para este filtro"
          description="Ajusta el rango o registra ventas y cambios de stock para ver auditoria."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-panel">
          <StockMovementsTable movements={movements.data.items} />
          <Pagination
            basePath="/dashboard/reports/stock-movements"
            searchParams={urlParams}
            total={movements.data.total}
            limit={movements.data.limit}
            offset={movements.data.offset}
          />
        </div>
      )}

      <ExportPanel role={session.role} reportParams={params} />
    </PageSection>
  );
}
