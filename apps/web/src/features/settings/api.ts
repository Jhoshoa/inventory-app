import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { StoreResponse } from "./types";

export async function getStore(): Promise<StoreResponse> {
  const token = await getAuthToken();
  const result = await apiRequest<StoreResponse>("/store", { token: token ?? undefined });
  if (!result.ok) throw result.error;
  return result.data;
}
