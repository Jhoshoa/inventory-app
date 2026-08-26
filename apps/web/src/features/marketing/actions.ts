"use server";

import { apiRequest } from "@/lib/api/client";
import { validateContactForm } from "./schemas";
import type { ContactFormState, ContactFormValues } from "./types";

interface LeadResponse {
  id: string;
  name: string;
}

export async function submitContactLeadAction(
  _previousState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const values: ContactFormValues = {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    storeName: String(formData.get("store_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    businessType: String(formData.get("business_type") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
    website: String(formData.get("website") ?? "").trim(),
  };

  const fieldErrors = validateContactForm(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Corrige los errores del formulario", fieldErrors };
  }

  const sourcePage = String(formData.get("source_page") ?? "").trim();

  const result = await apiRequest<LeadResponse>("/public/leads", {
    method: "POST",
    body: {
      name: values.name,
      phone: values.phone,
      store_name: values.storeName || undefined,
      email: values.email || undefined,
      business_type: values.businessType || undefined,
      message: values.message || undefined,
      source_page: sourcePage || undefined,
      website: values.website || undefined,
    },
  });

  if (!result.ok) {
    if (result.error.status === 429) {
      return {
        ok: false,
        message: "Enviaste varias solicitudes seguidas. Espera unos minutos e intenta de nuevo.",
        fieldErrors: {},
      };
    }
    if (result.error.code === "validation_error") {
      return {
        ok: false,
        message: "Revisa los datos ingresados e intenta nuevamente.",
        fieldErrors: {},
      };
    }
    return {
      ok: false,
      message: result.error.message || "No se pudo enviar tu mensaje. Intenta nuevamente.",
      fieldErrors: {},
    };
  }

  return {
    ok: true,
    message: "Listo. Te contactaremos pronto por WhatsApp o correo.",
    fieldErrors: {},
  };
}
