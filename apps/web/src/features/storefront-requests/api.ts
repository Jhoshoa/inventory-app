import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { StorefrontRequestListResponse, StorefrontRequestListResult } from "./types";

export async function listStorefrontRequests(limit = 50, offset = 0): Promise<StorefrontRequestListResult> {
  const token = await getAuthToken();
  if (!token) {
    return { ok: true, data: { items: [], total: 0, pending_count: 0, limit, offset } };
  }
  return apiRequest<StorefrontRequestListResponse>(
    `/storefront-requests?limit=${limit}&offset=${offset}`,
    { token },
  );
}
