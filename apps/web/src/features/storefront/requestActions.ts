"use server";

import { apiRequest } from "@/lib/api/client";
import { validateStorefrontRequestForm } from "./requestSchemas";
import type {
  StorefrontOrder,
  StorefrontOrderLineInput,
  StorefrontOrderState,
  StorefrontRequestFormValues,
} from "./requestTypes";

function failure(message: string, extra: Partial<{ fieldErrors: Record<string, string>; unavailableProductIds: string[] }> = {}): StorefrontOrderState {
  return { ok: false, message, fieldErrors: extra.fieldErrors ?? {}, unavailableProductIds: extra.unavailableProductIds ?? [] };
}

/** Envia la boleta: solo ids y cantidades, los precios los pone el backend. */
export async function createStorefrontOrderAction(
  slug: string,
  items: StorefrontOrderLineInput[],
  formData: FormData,
): Promise<StorefrontOrderState> {
  const values: StorefrontRequestFormValues = {
    customerName: String(formData.get("customer_name") ?? "").trim(),
    customerPhone: String(formData.get("customer_phone") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
    delivery: parseDelivery(formData.get("delivery")),
  };

  const fieldErrors = validateStorefrontRequestForm(values);
  if (items.length === 0) fieldErrors.items = "Tu boleta esta vacia";
  if (Object.keys(fieldErrors).length > 0) {
    return failure("Corrige los errores del formulario", { fieldErrors });
  }

  const result = await apiRequest<StorefrontOrder>(`/public/storefront/${encodeURIComponent(slug)}/orders`, {
    method: "POST",
    body: {
      customer_name: values.customerName,
      customer_phone: values.customerPhone,
      note: values.note || undefined,
      delivery_method: values.delivery || undefined,
      items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
    },
  });

  if (!result.ok) {
    if (result.error.status === 429) {
      return failure("Enviaste varios pedidos seguidos. Espera unos minutos e intenta de nuevo.");
    }
    const details = result.error.details as { unavailable_product_ids?: unknown } | null;
    if (result.error.status === 409 && Array.isArray(details?.unavailable_product_ids)) {
      return failure(result.error.message, { unavailableProductIds: details.unavailable_product_ids.map(String) });
    }
    return failure(result.error.message || "No se pudo enviar tu pedido. Intenta nuevamente.");
  }

  return { ok: true, message: "Listo, la tienda recibio tu pedido.", order: result.data };
}

function parseDelivery(value: FormDataEntryValue | null): StorefrontRequestFormValues["delivery"] {
  return value === "pickup" || value === "delivery" ? value : "";
}
