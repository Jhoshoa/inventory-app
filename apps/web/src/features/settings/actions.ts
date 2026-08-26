"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken, SESSION_COOKIE, serializeSession } from "@/lib/auth/session";
import { validateDiscountPolicyForm, validateStoreForm } from "./schemas";
import type {
  CheckoutState,
  DiscountPolicyFormValues,
  DiscountPolicyState,
  StoreEditorState,
  StoreFormValues,
  StoreResponse,
} from "./types";

export async function updateStoreAction(
  _previousState: StoreEditorState,
  formData: FormData,
): Promise<StoreEditorState> {
  const rawName = formData.get("name");
  const rawAddress = formData.get("address");
  const rawPhone = formData.get("phone");

  const values: StoreFormValues = {
    name: (typeof rawName === "string" ? rawName : "").trim(),
    address: typeof rawAddress === "string" ? rawAddress.trim() : "",
    phone: typeof rawPhone === "string" ? rawPhone.trim() : "",
  };

  const fieldErrors = validateStoreForm(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Corrige los errores del formulario", fieldErrors };
  }

  const token = await getAuthToken();
  if (!token) return { ok: false, message: "Sesion no valida", fieldErrors: {} };

  // address/phone se envian siempre (incluso vacios) para permitir borrarlos;
  // omitir la clave cuando estan vacios impediria limpiar un valor ya guardado,
  // porque el backend interpreta "campo ausente" como "no lo toques".
  const body: Record<string, string> = {
    name: values.name,
    address: values.address,
    phone: values.phone,
  };

  const result = await apiRequest<StoreResponse>("/store", {
    method: "PATCH",
    token,
    body,
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message, fieldErrors: {} };
  }

  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawSession) {
    try {
      const user = JSON.parse(Buffer.from(rawSession, "base64url").toString("utf8"));
      user.store_name = values.name;
      cookieStore.set(SESSION_COOKIE, serializeSession(user), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 8,
      });
    } catch {
      // skip updating session if it can't be parsed
    }
  }

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "Tienda actualizada correctamente", fieldErrors: {} };
}

export async function updateDiscountPolicyAction(
  _previousState: DiscountPolicyState,
  formData: FormData,
): Promise<DiscountPolicyState> {
  const values: DiscountPolicyFormValues = {
    allowPercentageDiscount: formData.get("allow_percentage_discount") === "on",
    maxPercentageDiscount: String(formData.get("max_percentage_discount") ?? "").trim(),
    allowManualDiscount: formData.get("allow_manual_discount") === "on",
    maxManualDiscountAmount: String(formData.get("max_manual_discount_amount") ?? "").trim(),
    allowCashierDiscountOverride: formData.get("allow_cashier_discount_override") === "on",
  };

  const fieldErrors = validateDiscountPolicyForm(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Corrige los errores del formulario", fieldErrors };
  }

  const token = await getAuthToken();
  if (!token) return { ok: false, message: "Sesion no valida", fieldErrors: {} };

  const result = await apiRequest<StoreResponse>("/store", {
    method: "PATCH",
    token,
    body: {
      allow_percentage_discount: values.allowPercentageDiscount,
      max_percentage_discount: values.maxPercentageDiscount || "0",
      allow_manual_discount: values.allowManualDiscount,
      max_manual_discount_amount: values.maxManualDiscountAmount || "0",
      allow_cashier_discount_override: values.allowCashierDiscountOverride,
    },
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message, fieldErrors: {} };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/pos");
  return { ok: true, message: "Politica de descuentos actualizada", fieldErrors: {} };
}

interface CheckoutResponse {
  store_name: string;
  billing_nit: string | null;
  subscription_status: string;
}

export async function requestCheckoutAction(): Promise<CheckoutState> {
  const token = await getAuthToken();
  if (!token) return { ok: false, message: "Sesion no valida" };

  const result = await apiRequest<CheckoutResponse>("/billing/checkout", {
    method: "POST",
    token,
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message || "No se pudo generar la solicitud de pago" };
  }

  revalidatePath("/dashboard/settings/billing");
  return {
    ok: true,
    storeName: result.data.store_name,
    billingNit: result.data.billing_nit,
    subscriptionStatus: result.data.subscription_status,
  };
}
