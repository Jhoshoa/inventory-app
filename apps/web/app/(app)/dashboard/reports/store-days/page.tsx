import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { Pagination } from "@/components/ui/Pagination";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
} from "@/components/ui/Table";
import { listCloseReports } from "@/features/store-day/api";
import { StoreDayReportsDateFilter } from "@/features/store-day/components/StoreDayReportsDateFilter";
import type { StoreDayCloseReport } from "@/features/store-day/types";
import { canViewStoreDayReports } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/format/currency";

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
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Cierres diarios</h1>
        <p className="mt-1 text-sm text-slate-600">
          Historial de cierres operativos y diferencias de caja.
        </p>
      </div>

      <StoreDayReportsDateFilter fromDate={params.from_date} toDate={params.to_date} />

      {!reports.ok ? (
        <Alert variant="error">No se pudieron cargar cierres: {reports.error.message}</Alert>
      ) : (
        <>
          <CloseReportsTable items={reports.data.items} />
          <Pagination
            basePath="/dashboard/reports/store-days"
            searchParams={new URLSearchParams(rawParamsToStringEntries(rawParams))}
            total={reports.data.total}
            limit={reports.data.limit}
            offset={reports.data.offset}
          />
        </>
      )}
    </section>
  );
}

function CloseReportsTable({ items }: { items: StoreDayCloseReport[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>Fecha</TableHeaderCell>
          <TableHeaderCell>Ventas</TableHeaderCell>
          <TableHeaderCell>Efectivo esperado</TableHeaderCell>
          <TableHeaderCell>Efectivo contado</TableHeaderCell>
          <TableHeaderCell>Diferencia</TableHeaderCell>
          <TableHeaderCell>Acciones</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <TableEmptyRow colSpan={6}>Sin cierres registrados</TableEmptyRow>
        ) : (
          items.map((item) => (
            <tr key={item.business_day_id} className="border-t border-slate-100">
              <TableCell>{formatBusinessDate(item.business_date)}</TableCell>
              <TableCell>{formatCurrency(item.sales_total)}</TableCell>
              <TableCell>{formatCurrency(item.expected_cash_amount)}</TableCell>
              <TableCell>{item.counted_cash_amount ? formatCurrency(item.counted_cash_amount) : "Sin conteo"}</TableCell>
              <TableCell>{item.cash_difference_amount ? formatCurrency(item.cash_difference_amount) : "No calculada"}</TableCell>
              <TableCell>
                <Button variant="secondary" asChild>
                  <Link href={`/dashboard/reports/store-days/${item.business_day_id}`}>Ver</Link>
                </Button>
              </TableCell>
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

function rawParamsToStringEntries(
  params: Record<string, string | string[] | undefined>,
): [string, string][] {
  return Object.entries(params).flatMap(([key, value]) => {
    if (!value) return [];
    const firstValue = Array.isArray(value) ? value[0] : value;
    return firstValue ? [[key, firstValue]] : [];
  });
}

function formatBusinessDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}
