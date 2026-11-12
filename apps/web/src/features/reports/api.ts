import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getAuthToken } from "@/lib/auth/session";
import {
  buildSalesReportApiQuery,
  buildStockMovementApiQuery,
} from "./schemas";
import type {
  ReportSearchParams,
  SalesReport,
  StockMovementListResponse,
  StockMovementSearchParams,
} from "./types";

export async function getSalesReport(params: ReportSearchParams) {
  const token = await getAuthToken();
  if (!token) return unauthorizedResult();

  return apiRequest<SalesReport>(
    `/reports/sales?${buildSalesReportApiQuery(params)}`,
    { token },
  );
}

/**
 * Más vendidos para Vender: los últimos 30 días. Una tienda más nueva que eso recibe 400
 * ("anterior a la apertura operativa"); entonces se piden sin fechas (la API usa el mes
 * desde la apertura).
 */
export async function getTopSellingProducts(params: ReportSearchParams) {
  const token = await getAuthToken();
  if (!token) return null;
  const recent = await apiRequest<SalesReport>(`/reports/sales?${buildSalesReportApiQuery(params)}`, { token });
  if (recent.ok) return recent.data.top_products;
  if (recent.error.status !== 400) return null;
  const sinceOpening = await apiRequest<SalesReport>("/reports/sales", { token });
  return sinceOpening.ok ? sinceOpening.data.top_products : null;
}

export async function listStockMovements(params: StockMovementSearchParams) {
  const token = await getAuthToken();
  if (!token) return unauthorizedResult();

  return apiRequest<StockMovementListResponse>(
    `/stock-movements?${buildStockMovementApiQuery(params)}`,
    { token },
  );
}

function unauthorizedResult() {
  return {
    ok: false as const,
    error: new ApiError({
      status: 401,
      code: "unauthorized",
      message: "No session",
    }),
  };
}
