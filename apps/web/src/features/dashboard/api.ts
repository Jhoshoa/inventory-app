import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { SalesReport } from "@/features/reports/types";
import type { DashboardScope, DashboardSummary, DashboardSummaryResult } from "./types";

/** Resumen de Inicio. Con `range`, el periodo es ese rango de fechas (p. ej. últimos 7 días). */
export async function getDashboardSummary(
  scope: DashboardScope = "today",
  range?: { from: string; to: string },
): Promise<DashboardSummaryResult> {
  const token = await getAuthToken();

  if (!token) {
    return {
      ok: true,
      data: createEmptyDashboardSummary(),
    };
  }

  const query = range ? `from_date=${range.from}&to_date=${range.to}` : `scope=${scope}`;
  const result = await apiRequest<DashboardSummary>(`/dashboard/summary?${query}`, {
    token,
  });

  if (!result.ok && result.error.code === "network_error") {
    return {
      ok: true,
      data: createEmptyDashboardSummary(),
    };
  }

  return result;
}

export function createEmptyDashboardSummary(): DashboardSummary {
  return {
    sales_today_total: "0",
    sales_today_count: 0,
    products_total: 0,
    low_stock_count: 0,
    out_of_stock_count: 0,
    latest_sales: [],
    low_stock_products: [],
    exchange_rates: [],
    scope: "today",
    from_date: null,
    to_date: null,
    timezone: null,
    first_business_date: null,
  };
}

/** Totales de ventas de un rango (artículos, por método de pago), para Inicio. */
export async function getSalesTotals(range: { from: string; to: string }) {
  const token = await getAuthToken();
  if (!token) return null;
  const result = await apiRequest<SalesReport>(`/reports/sales?from_date=${range.from}&to_date=${range.to}`, { token });
  return result.ok ? result.data : null;
}
