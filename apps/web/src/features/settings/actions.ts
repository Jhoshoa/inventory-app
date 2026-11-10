"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { storefrontCacheTag } from "@/features/storefront/api";
import {
  STOREFRONT_SORTS,
  WEEKDAYS,
  type StorefrontSettings,
  type StorefrontSort,
} from "@/features/storefront/settings";
import { cookies } from "next/headers";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken, SESSION_COOKIE, serializeSession } from "@/lib/auth/session";
import { validateDiscountPolicyForm, validateStoreForm, validateStorefrontForm } from "./schemas";
import type {
  CheckoutState,
  DiscountPolicyFormValues,
  DiscountPolicyState,
  StoreEditorState,
  StoreFormValues,
  StoreResponse,
  StorefrontFormValues,
  StorefrontState,
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

export async function updateStorefrontAction(
  _previousState: StorefrontState,
  formData: FormData,
): Promise<StorefrontState> {
  const values: StorefrontFormValues = {
    enabled: formData.get("storefront_enabled") === "on",
    slug: String(formData.get("storefront_slug") ?? "").trim().toLowerCase(),
    colorPrimary: String(formData.get("storefront_color_primary") ?? "").trim(),
    colorSecondary: String(formData.get("storefront_color_secondary") ?? "").trim(),
    description: String(formData.get("storefront_description") ?? "").trim(),
    whatsapp: String(formData.get("storefront_whatsapp") ?? "").trim(),
    paymentInstructions: String(formData.get("storefront_payment_instructions") ?? "").trim(),
    settings: storefrontSettingsFromForm(formData),
  };

  const fieldErrors = validateStorefrontForm(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Corrige los errores del formulario", fieldErrors };
  }

  const token = await getAuthToken();
  if (!token) return { ok: false, message: "Sesion no valida", fieldErrors: {} };

  const result = await apiRequest<StoreResponse>("/store", {
    method: "PATCH",
    token,
    body: {
      storefront_enabled: values.enabled,
      // El slug solo se envia si trae contenido: un slug vacio no es un
      // valor valido a guardar (min 3 caracteres en el backend), y omitirlo
      // deja el slug ya guardado intacto en vez de intentar borrarlo.
      ...(values.slug ? { storefront_slug: values.slug } : {}),
      storefront_color_primary: values.colorPrimary,
      storefront_color_secondary: values.colorSecondary,
      storefront_description: values.description,
      storefront_whatsapp: values.whatsapp,
      storefront_payment_instructions: values.paymentInstructions,
      storefront_settings: values.settings,
    },
  });

  if (!result.ok) {
    const serverErrors = settingsErrorsFromValidation(result.error.details);
    if (Object.keys(serverErrors).length > 0) {
      return { ok: false, message: "Corrige los errores del formulario", fieldErrors: serverErrors };
    }
    return { ok: false, message: result.error.message, fieldErrors: {} };
  }

  revalidatePath("/dashboard/settings");
  // El catalogo publico se cachea 5 min (ISR): el dueno tiene que ver su cambio ya.
  if (result.data.storefront_slug) {
    revalidateTag(storefrontCacheTag(result.data.storefront_slug));
  }
  return { ok: true, message: "Catalogo publico actualizado", fieldErrors: {} };
}

function text(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

function storefrontSettingsFromForm(formData: FormData): StorefrontSettings {
  const sort = String(formData.get("settings_default_sort") ?? "name") as StorefrontSort;
  return {
    announcement_enabled: formData.get("settings_announcement_enabled") === "on",
    announcement_text: text(formData, "settings_announcement_text"),
    show_featured: formData.get("settings_show_featured") === "on",
    show_payment: formData.get("settings_show_payment") === "on",
    show_contact: formData.get("settings_show_contact") === "on",
    stock_display: formData.get("settings_stock_display") === "out_of_stock" ? "out_of_stock" : "all",
    hide_out_of_stock: formData.get("settings_hide_out_of_stock") === "on",
    default_sort: STOREFRONT_SORTS.includes(sort) ? sort : "name",
    pickup_enabled: formData.get("settings_pickup_enabled") === "on",
    delivery_enabled: formData.get("settings_delivery_enabled") === "on",
    address: text(formData, "settings_address"),
    maps_url: text(formData, "settings_maps_url"),
    facebook: text(formData, "settings_facebook"),
    instagram: text(formData, "settings_instagram"),
    tiktok: text(formData, "settings_tiktok"),
    hours:
      formData.get("settings_hours_enabled") === "on"
        ? WEEKDAYS.map((_, index) => {
            const isOpen = formData.get(`hours_${index}_open`) === "on";
            return {
              is_open: isOpen,
              opens_at: isOpen ? text(formData, `hours_${index}_opens_at`) : null,
              closes_at: isOpen ? text(formData, `hours_${index}_closes_at`) : null,
            };
          })
        : null,
    featured_product_ids: formData
      .getAll("settings_featured_product_ids")
      .map(String)
      .filter(Boolean),
  };
}

const SETTINGS_FIELD_KEYS: Record<string, string> = {
  announcement_text: "announcementText",
  address: "address",
  maps_url: "mapsUrl",
  facebook: "facebook",
  instagram: "instagram",
  tiktok: "tiktok",
  featured_product_ids: "featured",
};

/** Errores 422 del backend sobre storefront_settings, como errores de campo del formulario. */
function settingsErrorsFromValidation(details: unknown): Record<string, string> {
  const detail = (details as { detail?: unknown } | null)?.detail;
  if (!Array.isArray(detail)) return {};
  const errors: Record<string, string> = {};
  for (const item of detail as Array<{ loc?: unknown[]; msg?: string }>) {
    const loc = item.loc ?? [];
    if (loc[1] !== "storefront_settings" || !item.msg) continue;
    const message = item.msg.replace(/^Value error, /, "");
    const field = typeof loc[2] === "string" ? loc[2] : undefined;
    if (field === "hours") {
      errors[typeof loc[3] === "number" ? `hours.${loc[3]}` : "hours"] = message;
    } else if (field && SETTINGS_FIELD_KEYS[field]) {
      errors[SETTINGS_FIELD_KEYS[field]] = message;
    } else {
      errors.settings = message;
    }
  }
  return errors;
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
