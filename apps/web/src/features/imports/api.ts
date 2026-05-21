import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getAuthToken } from "@/lib/auth/session";
import { buildImportQueryString } from "./schemas";
import type {
  ImportSearchParams,
  InventoryImport,
  InventoryImportListResponse,
} from "./types";

export async function listInventoryImports(params: ImportSearchParams) {
  const token = await getAuthToken();
  if (!token) return unauthorizedResult();

  return apiRequest<InventoryImportListResponse>(
    `/inventory-imports?${buildImportQueryString(params)}`,
    { token },
  );
}

export async function getInventoryImport(importId: string) {
  const token = await getAuthToken();
  if (!token) return unauthorizedResult();

  return apiRequest<InventoryImport>(`/inventory-imports/${importId}`, { token });
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
