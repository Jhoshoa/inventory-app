import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getAuthToken } from "@/lib/auth/session";
import type { Sale } from "./types";

export async function listSales() {
  const token = await getAuthToken();
  if (!token) return { ok: true as const, data: [] };
  return apiRequest<Sale[]>("/sales", { token });
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
