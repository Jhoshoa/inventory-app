import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { StoreLocationListResponse } from "./types";

export async function listStoreLocations() {
  const token = await getAuthToken();
  if (!token) return { ok: true as const, data: { items: [] } };
  return apiRequest<StoreLocationListResponse>("/store-locations", { token });
}
