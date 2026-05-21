"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import { isPaymentMethod, validateCheckout } from "./schemas";
import type { CartItem, PosProduct } from "./types";
import type { Sale, SaleActionState } from "@/features/sales/types";

export async function createSaleAction(
  _previousState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const cartItems = parseCartItems(formData.get("items"));
  const paymentMethod = stringValue(formData, "payment_method") || "efectivo";
  const customerName = stringValue(formData, "customer_name");
  const fieldErrors = validateCheckout(cartItems, paymentMethod);

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  if (!isPaymentMethod(paymentMethod)) {
    return { ok: false, fieldErrors: { payment_method: "Metodo de pago invalido" } };
  }

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
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): CartItem[] => {
      if (!isRecord(item) || !isRecord(item.product)) return [];
      const product = parseProduct(item.product);
      const quantity = Number(item.quantity);
      if (!product || !Number.isInteger(quantity)) return [];
      return [{ product, quantity }];
    });
  } catch {
    return [];
  }
}

function parseProduct(value: Record<string, unknown>): PosProduct | null {
  const stock = value.stock;
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.price !== "string" ||
    typeof value.unit !== "string" ||
    typeof stock !== "number" ||
    !Number.isInteger(stock)
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    price: value.price,
    stock,
    unit: value.unit,
    qr_code: typeof value.qr_code === "string" ? value.qr_code : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
