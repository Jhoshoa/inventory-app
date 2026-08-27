"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { StorefrontRequestActionState, StorefrontRequestResponse, StorefrontRequestStatus } from "./types";

export async function updateStorefrontRequestStatusAction(
  requestId: string,
  status: StorefrontRequestStatus,
): Promise<StorefrontRequestActionState> {
  const token = await getAuthToken();
  if (!token) return { ok: false, message: "Sesion no valida" };

  const result = await apiRequest<StorefrontRequestResponse>(`/storefront-requests/${requestId}/status`, {
    method: "PATCH",
    token,
    body: { status },
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  revalidatePath("/dashboard/solicitudes");
  const labels: Record<StorefrontRequestStatus, string> = {
    pending: "Marcada como pendiente",
    contacted: "Marcada como contactada",
    closed: "Marcada como cerrada",
  };
  return { ok: true, message: labels[status] };
}
