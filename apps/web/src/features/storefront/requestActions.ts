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
        note: values.note || undefined,
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
