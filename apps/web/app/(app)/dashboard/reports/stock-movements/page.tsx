import type { Metadata } from "next";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { Pagination } from "@/components/ui/Pagination";
import { listStockMovements } from "@/features/reports/api";
import { FilterLinks } from "@/features/reports/components/FilterLinks";
import { ReportsHeader } from "@/features/reports/components/ReportsHeader";
import { StockMovementList } from "@/features/reports/components/StockMovementList";
import { buildReportQueryString, parseStockMovementSearchParams } from "@/features/reports/schemas";
import { businessDateKey } from "@/features/sales/list";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Movimientos de stock" };

const TYPES = [
  { value: "all", label: "Todos" },
  { value: "sale", label: "Venta" },
  { value: "sale_void", label: "Anulación" },
  { value: "manual_adjustment", label: "Ajuste manual" },
  { value: "import", label: "Importación" },
];

// Reportes › Movimientos de stock (tablero P08): también lo ve el cajero.
export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseStockMovementSearchParams(await searchParams);
  const [session, movements] = await Promise.all([requireSession(), listStockMovements(params)]);
  const query = (type: string) => {
    const search = new URLSearchParams(buildReportQueryString(params));
    if (type !== "all") search.set("type", type);
    if (params.product_id) search.set("product_id", params.product_id);
    return search;
  };

  return (
    <div className="flex flex-col gap-3">
      <ReportsHeader section="stock" role={session.role} params={params} />
      <FilterLinks
        label="Tipo de movimiento"
        options={TYPES}
        active={TYPES.some((item) => item.value === params.type) ? params.type : "all"}
        hrefFor={(value) => `/dashboard/reports/stock-movements?${query(value)}`}
      />
      {!movements.ok ? (
        <DataFetchError resource="los movimientos de stock" error={movements.error.message} />
      ) : movements.data.items.length === 0 ? (
        <p className="rounded-card border border-app-border bg-app-surface px-4 py-8 text-center text-sm text-text-muted">
          Sin movimientos de stock en estas fechas.
        </p>
      ) : (
        <>
          <StockMovementList movements={movements.data.items} today={businessDateKey()} />
          {movements.data.total > movements.data.limit ? (
            <Pagination
              basePath="/dashboard/reports/stock-movements"
              searchParams={query(params.type)}
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
