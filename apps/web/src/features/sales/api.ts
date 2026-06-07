import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getAuthToken } from "@/lib/auth/session";
import { buildSalesApiQuery } from "./schemas";
import type { Sale, SaleListResponse, SaleSearchParams } from "./types";

export async function listSales(params: SaleSearchParams) {
  const token = await getAuthToken();
  if (!token) {
    return {
      ok: false as const,
      error: new ApiError({
        status: 401,
        code: "unauthorized",
        message: "No session",
      }),
    };
  }
  return apiRequest<SaleListResponse>(`/sales?${buildSalesApiQuery(params)}`, { token });
}

export async function getSale(saleId: string) {
  const token = await getAuthToken();
  if (!token) {
    return {
      ok: false as const,
      error: new ApiError({
        status: 401,
        code: "unauthorized",
        message: "No session",
      }),
    };
  }
  return apiRequest<Sale>(`/sales/${saleId}`, { token });
}
