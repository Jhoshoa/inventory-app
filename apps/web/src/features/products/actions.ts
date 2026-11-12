"use server";

import { revalidatePath } from "next/cache";
import { revalidateStorefrontCatalog } from "@/features/storefront/revalidate";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import { parseMoney } from "@/lib/format/currency";
import { productApiFieldErrors } from "./form";
import {
  alertDaysOrStoreDefault,
  formDataToProductValues,
  validateDefaultAlertDays,
  validateProductForm,
  validateStockAdjustment,
} from "./schemas";
import type { Product, ProductActionState } from "./types";

export async function createProductAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const values = formDataToProductValues(formData);
  const fieldErrors = validateProductForm(values, "create");
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values };
  }

  const token = await getAuthToken();
  const result = await apiRequest<Product>("/products", {
    method: "POST",
    token: token ?? undefined,
    body: createPayload(values),
  });

  if (!result.ok) {
    const apiFieldErrors = productApiFieldErrors(result.error.status, result.error.message);
    if (Object.keys(apiFieldErrors).length > 0) return { ok: false, fieldErrors: apiFieldErrors, values };
    return { ok: false, message: result.error.message, values, fieldErrors: {} };
  }

  // "Dónde está" elegido en el formulario: se guarda justo después de crear (tablero P02).
  const locations = locationItems(formData);
  let locationsFailed = false;
  if (locations.length > 0) {
    const saved = await apiRequest(`/products/${result.data.id}/locations`, {
      method: "PUT",
      token: token ?? undefined,
      body: { items: locations },
    });
    locationsFailed = !saved.ok;
  }

  let photoUploadFailed = false;
  const photoEntry = findPhotoFile(formData);
  if (photoEntry) {
    try {
      const baseUrl = process.env.BACKEND_API_URL || "http://localhost:8001";
      const uploadForm = new FormData();
      // Reenviamos el File tal cual llego en el FormData del formulario (ya
      // optimizado por ImageUploader del lado del cliente): evita depender
      // de File.prototype.bytes(), que no existe en el runtime de Node que
      // corre esta Server Action y hacia que esto fallara siempre en
      // silencio dentro del catch de abajo.
      uploadForm.append("file", photoEntry, photoEntry.name || "photo.jpg");
      const photoResponse = await fetch(`${baseUrl}/api/v1/products/${result.data.id}/photo`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: uploadForm,
      });
      if (!photoResponse.ok) {
        photoUploadFailed = true;
      }
    } catch {
      // El producto ya se creo; que la foto falle no debe bloquear el
      // flujo, pero se lo avisamos al usuario via el parametro de la
      // redireccion en vez de fallar en silencio.
      photoUploadFailed = true;
    }
  }

  await revalidateStorefrontCatalog();
  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${result.data.id}`);
  const notice = new URLSearchParams({ creado: "1" });
  if (photoUploadFailed) notice.set("photo_error", "1");
  if (locationsFailed) notice.set("lugares_error", "1");
  redirect(`/dashboard/products/${result.data.id}?${notice.toString()}`);
}

export async function updateProductAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const productId = stringValue(formData, "product_id");
  const values = formDataToProductValues(formData);
  const fieldErrors = validateProductForm(values, "edit");
  if (!productId) {
    return { ok: false, message: "Producto invalido", fieldErrors: {}, values };
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values };
  }

  const token = await getAuthToken();
  const result = await apiRequest<Product>(`/products/${productId}`, {
    method: "PATCH",
    token: token ?? undefined,
    body: updatePayload(values),
  });

  if (!result.ok) {
    const apiFieldErrors = productApiFieldErrors(result.error.status, result.error.message);
    if (Object.keys(apiFieldErrors).length > 0) return { ok: false, fieldErrors: apiFieldErrors, values };
    return { ok: false, message: result.error.message, fieldErrors: {}, values };
  }

  await revalidateStorefrontCatalog();
  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${productId}`);
  redirect(`/dashboard/products/${productId}?guardado=1`);
}

export async function adjustStockAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const productId = stringValue(formData, "product_id");
  const quantity = stringValue(formData, "quantity");
  const reason = stringValue(formData, "reason");
  const currentStockRaw = stringValue(formData, "current_stock");
  const currentStock = currentStockRaw ? Number(currentStockRaw) : undefined;
  const expiresOn = stringValue(formData, "expires_on");
  const alertDays = stringValue(formData, "alert_days");
  const batchId = stringValue(formData, "batch_id");
  const batchAvailableRaw = stringValue(formData, "batch_available");
  const fieldErrors = validateStockAdjustment(quantity, reason, currentStock, {
    expiresOn,
    alertDays,
    batchId,
    batchAvailable: batchAvailableRaw ? Number(batchAvailableRaw) : undefined,
  });

  if (!productId) return { ok: false, message: "Producto invalido", fieldErrors: {} };
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const token = await getAuthToken();
  const result = await apiRequest<Product>(`/products/${productId}/stock`, {
    method: "PATCH",
    token: token ?? undefined,
    body: {
      quantity: Number(quantity),
      reason: reason || null,
      ...(expiresOn ? { expires_on: expiresOn, alert_days: alertDaysOrStoreDefault(alertDays) } : {}),
      ...(batchId ? { batch_id: batchId } : {}),
    },
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  await revalidateStorefrontCatalog();
  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${productId}`);
  return { ok: true, message: "Stock actualizado", fieldErrors: {} };
}

export async function deleteProductAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const productId = stringValue(formData, "product_id");
  const confirm = stringValue(formData, "confirm");

  if (!productId) return { ok: false, message: "Producto invalido", fieldErrors: {} };
  if (confirm !== "ELIMINAR") {
    return {
      ok: false,
      fieldErrors: { confirm: "Escribe ELIMINAR para confirmar" },
    };
  }

  const token = await getAuthToken();
  const result = await apiRequest<void>(`/products/${productId}`, {
    method: "DELETE",
    token: token ?? undefined,
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  await revalidateStorefrontCatalog();
  revalidatePath("/dashboard/products");
  return { ok: true, message: "Producto eliminado", fieldErrors: {} };
}

function createPayload(values: ReturnType<typeof formDataToProductValues>) {
  return {
    name: values.name,
    price: money(values.price),
    stock: Number(values.stock),
    category_id: nullable(values.category_id),
    category: nullable(values.category),
    min_stock: values.min_stock ? Number(values.min_stock) : 1,
    unit: values.unit || "unidad",
    sku: nullable(values.sku),
    cost_price: values.cost_price ? money(values.cost_price) : null,
    photo_url: null,
    qr_code: nullable(values.qr_code),
    discount_type: values.discount_type || null,
    discount_value: values.discount_type ? money(values.discount_value) || "0" : "0",
    discount_ends_at: values.discount_type ? discountEndsAtIso(values.discount_ends_at) : null,
    ...(values.expires_on
      ? { expires_on: values.expires_on, alert_days: alertDaysOrStoreDefault(values.alert_days) }
      : {}),
  };
}

function updatePayload(values: ReturnType<typeof formDataToProductValues>) {
  return {
    name: values.name,
    price: money(values.price),
    category_id: nullable(values.category_id),
    category: nullable(values.category),
    min_stock: values.min_stock ? Number(values.min_stock) : 1,
    unit: values.unit || "unidad",
    sku: nullable(values.sku),
    cost_price: values.cost_price ? money(values.cost_price) : null,
    photo_url: null,
    qr_code: nullable(values.qr_code),
    discount_type: values.discount_type || null,
    discount_value: values.discount_type ? money(values.discount_value) || "0" : null,
    remove_discount: !values.discount_type,
    discount_ends_at: values.discount_type ? discountEndsAtIso(values.discount_ends_at) : null,
  };
}

function discountEndsAtIso(dateOnly: string): string | null {
  return dateOnly ? `${dateOnly}T23:59:59.999Z` : null;
}

/** "18,50" → "18.50" para la API (ya validado). */
function money(value: string) {
  const parsed = parseMoney(value);
  return parsed.ok ? parsed.value : value;
}

/** `locations` del formulario: JSON [{ location_id, kind }] (hasta 6, lo revisa la API). */
function locationItems(formData: FormData): { location_id: string; kind: "display" | "storage" }[] {
  const raw = stringValue(formData, "locations");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is { location_id: string; kind: "display" | "storage" } =>
          typeof item?.location_id === "string" && (item.kind === "display" || item.kind === "storage"),
      )
      .slice(0, 6);
  } catch {
    return [];
  }
}

function nullable(value: string) {
  return value.trim() ? value.trim() : null;
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function findPhotoFile(formData: FormData): File | null {
  for (const [, value] of formData.entries()) {
    if (value instanceof File && value.size > 0 && value.name) {
      return value;
    }
  }
  return null;
}

/** Aviso de vencimiento de la tienda (tablero P01B, backend B4): se usa al cargar un lote sin otro número. */
export async function updateDefaultAlertDaysAction(
  value: string,
): Promise<{ ok: boolean; message?: string; fieldError?: string; days?: number }> {
  const fieldError = validateDefaultAlertDays(value);
  if (fieldError) return { ok: false, fieldError };

  const token = await getAuthToken();
  const result = await apiRequest<{ default_alert_days: number }>("/store", {
    method: "PATCH",
    token: token ?? undefined,
    body: { default_alert_days: Number(value.trim()) },
  });
  if (!result.ok) return { ok: false, message: result.error.message };

  revalidatePath("/dashboard/products", "layout");
  revalidatePath("/dashboard");
  return { ok: true, message: "Aviso de vencimiento guardado", days: result.data.default_alert_days };
}
