import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getAuthToken } from "@/lib/auth/session";
import { DEFAULT_SALE_LIMIT, buildSalesApiQuery } from "./schemas";
import type { Sale, SaleListResponse, SaleSearchParams } from "./types";

export async function listSales(params: SaleSearchParams) {
  const token = await getAuthToken();
  if (!token) return { ok: true as const, data: emptySaleList(params.limit, params.offset) };
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

function emptySaleList(limit = DEFAULT_SALE_LIMIT, offset = 0): SaleListResponse {
  const today = new Date().toISOString().slice(0, 10);
  return {
    items: [],
    total: 0,
    limit,
    offset,
    from_date: today,
    to_date: today,
    timezone: "America/La_Paz",
    first_business_date: null,
  };
}
