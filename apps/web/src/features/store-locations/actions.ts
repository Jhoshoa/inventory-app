"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import { formDataToStoreLocationValues, locationConflictField, storeLocationPayload, validateStoreLocation } from "./schemas";
import type { ProductLocation, ProductLocationKind, StoreLocation, StoreLocationActionState } from "./types";

export async function saveStoreLocationAction(
  _previousState: StoreLocationActionState,
  formData: FormData,
): Promise<StoreLocationActionState> {
  const locationId = stringValue(formData, "location_id");
  const values = formDataToStoreLocationValues(formData);
  const fieldErrors = validateStoreLocation(values);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const token = await getAuthToken();
  const result = await apiRequest<StoreLocation>(locationId ? `/store-locations/${locationId}` : "/store-locations", {
    method: locationId ? "PATCH" : "POST",
    token: token ?? undefined,
    body: storeLocationPayload(values),
  });
  if (!result.ok) {
    const conflict = result.error.status === 409 ? locationConflictField(result.error.message) : {};
    if (Object.keys(conflict).length > 0) return { ok: false, fieldErrors: conflict };
    return { ok: false, message: result.error.message, fieldErrors: {} };
  }

  revalidateLocationPaths();
  return {
    ok: true,
    message: locationId ? "Lugar guardado" : "Lugar agregado",
    location: result.data,
    fieldErrors: {},
  };
}

export async function deleteStoreLocationAction(locationId: string): Promise<{ ok: boolean; message: string }> {
  if (!locationId) return { ok: false, message: "Lugar inválido" };
  const token = await getAuthToken();
  const result = await apiRequest<void>(`/store-locations/${locationId}`, {
    method: "DELETE",
    token: token ?? undefined,
  });
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidateLocationPaths();
  return { ok: true, message: "Lugar eliminado" };
}

export async function setProductLocationsAction(
  productId: string,
  items: { location_id: string; kind: ProductLocationKind }[],
): Promise<{ ok: boolean; message: string; locations?: ProductLocation[] }> {
  if (!productId) return { ok: false, message: "Ese producto ya no existe" };
  const token = await getAuthToken();
  const result = await apiRequest<ProductLocation[]>(`/products/${productId}/locations`, {
    method: "PUT",
    token: token ?? undefined,
    body: { items },
  });
  if (!result.ok) return { ok: false, message: result.error.message };
  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath("/dashboard/products/lugares");
  return { ok: true, message: "Ubicaciones guardadas", locations: result.data };
}

function revalidateLocationPaths() {
  // Pestaña Lugares en la tienda, lista y detalle de productos (Dónde está).
  revalidatePath("/dashboard/products", "layout");
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
