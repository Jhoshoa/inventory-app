import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { Pagination } from "@/components/ui/Pagination";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
} from "@/components/ui/Table";
import { StoreDayReportsDateFilter } from "@/features/store-day/components/StoreDayReportsDateFilter";
import { listCashMovements } from "@/features/store-day/api";
import type { CashMovement } from "@/features/store-day/types";
import { canViewCashMovements } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/format/currency";

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

      <StoreDayReportsDateFilter fromDate={params.from_date} toDate={params.to_date} />

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

function CashMovementsTable({ items }: { items: CashMovement[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>Fecha</TableHeaderCell>
          <TableHeaderCell>Tipo</TableHeaderCell>
          <TableHeaderCell>Monto</TableHeaderCell>
          <TableHeaderCell>Nota</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <TableEmptyRow colSpan={4}>Sin movimientos</TableEmptyRow>
        ) : (
          items.map((item) => (
            <tr key={item.id} className="border-t border-slate-100">
              <TableCell>{formatDateTime(item.occurred_at)}</TableCell>
              <TableCell>{cashMovementLabel(item.movement_type)}</TableCell>
              <TableCell className={item.direction === "in" ? "text-emerald-700" : "text-red-700"}>
                {item.direction === "in" ? "+" : "-"}{formatCurrency(item.amount)}
              </TableCell>
              <TableCell>{item.note ?? "Sin nota"}</TableCell>
            </tr>
          ))
        )}
      </tbody>
    </Table>
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

function rawParamsToStringEntries(params: Record<string, string | string[] | undefined>): [string, string][] {
  return Object.entries(params).flatMap(([key, value]) => {
    if (!value) return [];
    const firstValue = Array.isArray(value) ? value[0] : value;
    return firstValue ? [[key, firstValue]] : [];
  });
}

function cashMovementLabel(type: string) {
  const labels: Record<string, string> = {
    cash_in: "Entrada",
    cash_out: "Salida",
    expense: "Gasto",
    deposit: "Deposito",
    withdrawal: "Retiro",
  };
  return labels[type] ?? type;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
