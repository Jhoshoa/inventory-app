"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import { validateCheckout } from "./schemas";
import type { CartItem } from "./types";
import type { Sale, SaleActionState } from "@/features/sales/types";

export async function createSaleAction(
  _previousState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const cartItems = parseCartItems(formData.get("items"));
  const paymentMethod = stringValue(formData, "payment_method") || "efectivo";
  const customerName = stringValue(formData, "customer_name");
  const fieldErrors = validateCheckout(cartItems);

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const token = await getAuthToken();
  const result = await apiRequest<Sale>("/sales", {
    method: "POST",
    token: token ?? undefined,
    body: {
      items: cartItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      payment_method: paymentMethod,
      device_id: "web-pos",
      customer_name: customerName || null,
    },
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/sales");
  redirect(`/dashboard/sales/${result.data.id}`);
}

function parseCartItems(value: FormDataEntryValue | null): CartItem[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
