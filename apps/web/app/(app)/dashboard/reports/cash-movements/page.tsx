import type { Metadata } from "next";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { Pagination } from "@/components/ui/Pagination";
import { CashMovementList } from "@/features/reports/components/CashMovementList";
import { FilterLinks } from "@/features/reports/components/FilterLinks";
import { ReportsHeader } from "@/features/reports/components/ReportsHeader";
import { buildReportQueryString, parseReportSearchParams } from "@/features/reports/schemas";
import { businessDateKey } from "@/features/sales/list";
import { listCashMovements } from "@/features/store-day/api";
import { listUsers } from "@/features/users/api";
import { canViewCashMovements } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Movimientos de caja" };

const LIMIT = 50;
const TYPES = [
  { value: "all", label: "Todos" },
  { value: "cash_in", label: "Entradas" },
  { value: "expense", label: "Gastos" },
  { value: "cash_out", label: "Salidas" },
  { value: "withdrawal", label: "Retiros" },
  { value: "deposit", label: "Depósitos" },
];

// Reportes › Movimientos de caja (tablero P08, solo el dueño): para leer; anular se hace en Caja.
export default async function CashMovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  if (!canViewCashMovements(session.role)) {
    return <ForbiddenState description="Solo el dueño de la tienda puede ver los movimientos de caja." />;
  }

  const raw = await searchParams;
  const params = parseReportSearchParams(raw);
  const typeValue = typeof raw.type === "string" ? raw.type : "all";
  const type = TYPES.some((item) => item.value === typeValue) ? typeValue : "all";
  const offset = Math.max(Number(raw.offset) || 0, 0);
  const [movements, users] = await Promise.all([
    listCashMovements({ from_date: params.from, to_date: params.to, type, include_voided: true, limit: LIMIT, offset }),
    listUsers(100, 0),
  ]);
  const names = users.ok ? Object.fromEntries(users.data.items.map((user) => [user.id, user.full_name || user.email.split("@")[0]])) : {};
  const query = (nextType: string) => {
    const search = new URLSearchParams(buildReportQueryString(params));
    if (nextType !== "all") search.set("type", nextType);
    return search;
  };

  return (
    <div className="flex flex-col gap-3">
      <ReportsHeader section="caja" role={session.role} params={params} />
      <FilterLinks label="Tipo de movimiento" options={TYPES} active={type} hrefFor={(value) => `/dashboard/reports/cash-movements?${query(value)}`} />
      {!movements.ok ? (
        <DataFetchError resource="los movimientos de caja" error={movements.error.message} />
      ) : movements.data.items.length === 0 ? (
        <p className="rounded-card border border-app-border bg-app-surface px-4 py-8 text-center text-sm text-text-muted">
          Sin movimientos de caja en estas fechas. Se registran en Caja mientras está abierta.
        </p>
      ) : (
        <>
          <CashMovementList movements={movements.data.items} names={names} today={businessDateKey()} />
          {movements.data.total > movements.data.limit ? (
            <Pagination
              basePath="/dashboard/reports/cash-movements"
              searchParams={query(type)}
              total={movements.data.total}
              limit={movements.data.limit}
              offset={movements.data.offset}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
