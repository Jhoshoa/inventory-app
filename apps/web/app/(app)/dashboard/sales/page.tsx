import type { Metadata } from "next";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { getSalesReport } from "@/features/reports/api";
import { listSales } from "@/features/sales/api";
import { SalesBrowser } from "@/features/sales/components/SalesBrowser";
import { businessDateKey, toSalesSummary } from "@/features/sales/list";
import { parseSalesSearchParams } from "@/features/sales/schemas";
import type { SaleSearchParams } from "@/features/sales/types";
import { getStore } from "@/features/settings/api";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Ventas" };

// Ventas (tablero P06): hoy por defecto; ?from_date, ?to_date y ?status vienen de los filtros.
export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseSalesSearchParams(await searchParams);
  const today = businessDateKey();
  const [session, store] = await Promise.all([requireSession(), getStore().catch(() => null)]);

  let sales = await listSales({ ...params, offset: 0 });
  // Fechas de un enlace viejo (antes del primer día o más de 90 días): se muestra hoy.
  if (!sales.ok && sales.error.status === 400 && (params.from_date || params.to_date)) {
    sales = await listSales({ status: params.status, limit: params.limit, offset: 0 });
  }

  if (!sales.ok) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Ventas</h1>
        <DataFetchError resource="las ventas" error={sales.error.message} />
      </div>
    );
  }

  const range = { from_date: sales.data.from_date, to_date: sales.data.to_date };
  const voidedQuery: SaleSearchParams = { ...range, status: "voided", limit: 1, offset: 0 };
  const [report, voided] = await Promise.all([
    getSalesReport({ range: "custom", from: range.from_date, to: range.to_date }),
    listSales(voidedQuery),
  ]);

  return (
    <SalesBrowser
      initialFilters={{ ...range, status: params.status }}
      initialData={sales.data}
      initialSummary={toSalesSummary(report.ok ? report.data : null, voided.ok ? voided.data.total : null)}
      role={session.role}
      store={{ name: store?.name ?? "", address: store?.address, phone: store?.phone }}
      today={today}
    />
  );
}
