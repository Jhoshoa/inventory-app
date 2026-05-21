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
