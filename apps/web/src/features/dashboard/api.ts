import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { DashboardScope, DashboardSummary, DashboardSummaryResult } from "./types";

export async function getDashboardSummary(scope: DashboardScope = "today"): Promise<DashboardSummaryResult> {
  const token = await getAuthToken();

  if (!token) {
    return {
      ok: true,
      data: createEmptyDashboardSummary(),
    };
  }

  const result = await apiRequest<DashboardSummary>(`/dashboard/summary?scope=${scope}`, {
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
