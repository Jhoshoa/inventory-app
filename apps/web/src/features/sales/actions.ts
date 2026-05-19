"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import { validateVoidSale } from "./schemas";
import type { Sale, SaleActionState } from "./types";

export async function voidSaleAction(
  _previousState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const saleId = stringValue(formData, "sale_id");
  const reason = stringValue(formData, "reason");
  const fieldErrors = validateVoidSale(reason);

  if (!saleId) return { ok: false, message: "Venta invalida", fieldErrors: {} };
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const token = await getAuthToken();
  const result = await apiRequest<Sale>(`/sales/${saleId}/void`, {
    method: "POST",
    token: token ?? undefined,
    body: { reason },
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  revalidatePath("/dashboard/sales");
  revalidatePath(`/dashboard/sales/${saleId}`);
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard");
  return { ok: true, message: "Venta anulada", fieldErrors: {} };
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
