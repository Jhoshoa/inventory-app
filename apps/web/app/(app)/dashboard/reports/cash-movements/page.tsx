import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
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
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Movimientos de caja</h1>
          <p className="mt-1 text-sm text-slate-600">
            Entradas, gastos, depositos y retiros operativos por jornada.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/dashboard/reports">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver a reportes
          </Link>
        </Button>
      </div>

      <CashMovementsReportControls params={params} />

      {!movements.ok ? (
        <Alert variant="error">No se pudieron cargar movimientos: {movements.error.message}</Alert>
      ) : movements.data.total === 0 ? (
        <EmptyState
          title="Sin movimientos de caja"
          description="Registra movimientos desde Ajustes cuando la tienda este abierta."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
    </section>
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
