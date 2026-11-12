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
  if (!token) return { ok: false, message: "Tu sesión terminó. Vuelve a entrar." };

  const result = await apiRequest<StorefrontRequestResponse>(`/storefront-requests/${requestId}/status`, {
    method: "PATCH",
    token,
    body: { status },
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  revalidatePath("/dashboard/solicitudes");
  revalidatePath("/dashboard");
  const labels: Record<StorefrontRequestStatus, string> = {
    pending: "Pedido marcado como pendiente",
    contacted: "Pedido marcado como contactado",
    closed: "Pedido cerrado",
  };
  return { ok: true, message: labels[status], request: result.data };
}

export async function updateStorefrontRequestPaymentAction(
  requestId: string,
  paymentConfirmed: boolean,
): Promise<StorefrontRequestActionState> {
  const token = await getAuthToken();
  if (!token) return { ok: false, message: "Tu sesión terminó. Vuelve a entrar." };

  const result = await apiRequest<StorefrontRequestResponse>(`/storefront-requests/${requestId}/payment`, {
    method: "PATCH",
    token,
    body: { payment_confirmed: paymentConfirmed },
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  revalidatePath("/dashboard/solicitudes");
  return { ok: true, message: paymentConfirmed ? "Pago recibido" : "Pago desmarcado", request: result.data };
}
