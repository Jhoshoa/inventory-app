"use server";

import { apiRequest } from "@/lib/api/client";
import { validateStorefrontRequestForm } from "./requestSchemas";
import { INITIAL_STOREFRONT_REQUEST_STATE } from "./requestTypes";
import type { StorefrontRequestFormValues, StorefrontRequestState } from "./requestTypes";

export async function createStorefrontRequestAction(
  slug: string,
  productId: string,
  _previousState: StorefrontRequestState,
  formData: FormData,
): Promise<StorefrontRequestState> {
  const values: StorefrontRequestFormValues = {
    customerName: String(formData.get("customer_name") ?? "").trim(),
    customerPhone: String(formData.get("customer_phone") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
    delivery: parseDelivery(formData.get("delivery")),
  };

  const fieldErrors = validateStorefrontRequestForm(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Corrige los errores del formulario", fieldErrors };
  }

  const result = await apiRequest(
    `/public/storefront/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}/requests`,
    {
      method: "POST",
      body: {
        customer_name: values.customerName,
        customer_phone: values.customerPhone,
        note: requestNote(values) || undefined,
      },
    },
  );

  if (!result.ok) {
    if (result.error.status === 429) {
      return {
        ok: false,
        message: "Enviaste varias solicitudes seguidas. Espera unos minutos e intenta de nuevo.",
        fieldErrors: {},
      };
    }
    return {
      ok: false,
      message: result.error.message || "No se pudo enviar tu solicitud. Intenta nuevamente.",
      fieldErrors: {},
    };
  }

  return { ...INITIAL_STOREFRONT_REQUEST_STATE, ok: true, message: "Listo, la tienda te va a contactar pronto." };
}

function parseDelivery(value: FormDataEntryValue | null): StorefrontRequestFormValues["delivery"] {
  return value === "pickup" || value === "delivery" ? value : "";
}

const DELIVERY_LABELS = { pickup: "Recojo en tienda", delivery: "Envio a domicilio" } as const;

/** La forma de entrega viaja en la nota: la tienda la ve en Pedidos sin otro campo. */
function requestNote(values: StorefrontRequestFormValues): string {
  if (!values.delivery) return values.note;
  const delivery = `Entrega: ${DELIVERY_LABELS[values.delivery]}`;
  return values.note ? `${delivery}\n${values.note}` : delivery;
}
