import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { ProductCategoryListResponse } from "./types";

export async function listProductCategories(includeInactive = false) {
  const token = await getAuthToken();
  if (!token) return { ok: true as const, data: { items: [] } };

  const query = new URLSearchParams();
  if (includeInactive) query.set("include_inactive", "true");
  const queryString = query.toString();

  return apiRequest<ProductCategoryListResponse>(
    `/product-categories${queryString ? `?${queryString}` : ""}`,
    { token },
  );
}
