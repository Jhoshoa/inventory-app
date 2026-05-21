import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
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
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Movimientos de stock
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Auditoria global de ventas, anulaciones y ajustes de inventario.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/dashboard/reports">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver a reportes
          </Link>
        </Button>
      </div>

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
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
    </section>
  );
}
