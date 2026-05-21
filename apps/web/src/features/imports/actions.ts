"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import {
  formDataToImportItemValues,
  validateImportItem,
} from "./schemas";
import type {
  ConfirmInventoryImportResponse,
  ImportActionState,
  InventoryImport,
  InventoryImportItemStatus,
} from "./types";

export async function updateImportItemAction(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const values = formDataToImportItemValues(formData);
  if (!values.import_id || !values.item_id) {
    return { ok: false, message: "Item invalido", fieldErrors: {} };
  }

  const fieldErrors = validateImportItem(values);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const result = await mutateImport<InventoryImport>(
    `/inventory-imports/${values.import_id}/items/${values.item_id}`,
    "PATCH",
    itemPayload(values.status, values),
  );

  if (!result.ok) return result;
  revalidateImportPaths(values.import_id);
  return { ok: true, message: "Item actualizado", fieldErrors: {} };
}

export async function setImportItemStatusAction(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const values = formDataToImportItemValues(formData);
  if (!values.import_id || !values.item_id) {
    return { ok: false, message: "Item invalido", fieldErrors: {} };
  }

  const fieldErrors = validateImportItem(values);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const result = await mutateImport<InventoryImport>(
    `/inventory-imports/${values.import_id}/items/${values.item_id}`,
    "PATCH",
    itemPayload(values.status, values),
  );

  if (!result.ok) return result;
  revalidateImportPaths(values.import_id);
  return { ok: true, message: "Estado actualizado", fieldErrors: {} };
}

export async function confirmImportAction(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const importId = stringValue(formData, "import_id");
  if (!importId) return { ok: false, message: "Importacion invalida", fieldErrors: {} };

  const result = await mutateImport<ConfirmInventoryImportResponse>(
    `/inventory-imports/${importId}/confirm`,
    "POST",
  );

  if (!result.ok) return result;
  revalidateImportPaths(importId);
  revalidatePath("/dashboard/products");
  return {
    ok: true,
    message: `Importacion confirmada: ${result.data?.created_products ?? 0} productos creados`,
    fieldErrors: {},
  };
}

export async function cancelImportAction(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const importId = stringValue(formData, "import_id");
  const confirm = stringValue(formData, "confirm");
  if (!importId) return { ok: false, message: "Importacion invalida", fieldErrors: {} };
  if (confirm !== "CANCELAR") {
    return { ok: false, fieldErrors: { confirm: "Escribe CANCELAR para confirmar" } };
  }

  const result = await mutateImport<InventoryImport>(
    `/inventory-imports/${importId}/cancel`,
    "POST",
  );

  if (!result.ok) return result;
  revalidateImportPaths(importId);
  return { ok: true, message: "Importacion cancelada", fieldErrors: {} };
}

async function mutateImport<T>(
  path: string,
  method: "PATCH" | "POST",
  body?: unknown,
): Promise<ImportActionState & { data?: T }> {
  const token = await getAuthToken();
  const result = await apiRequest<T>(path, {
    method,
    token: token ?? undefined,
    body,
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message, fieldErrors: {} };
  }

  return { ok: true, data: result.data, fieldErrors: {} };
}

function itemPayload(status: InventoryImportItemStatus, values: ReturnType<typeof formDataToImportItemValues>) {
  return {
    status,
    name: values.name,
    category: nullable(values.category),
    sku: nullable(values.sku),
    unit: values.unit || "unidad",
    price: values.price,
    cost_price: values.cost_price || null,
    stock: Number(values.stock),
    min_stock: Number(values.min_stock),
  };
}

function revalidateImportPaths(importId: string) {
  revalidatePath("/dashboard/imports");
  revalidatePath(`/dashboard/imports/${importId}`);
  revalidatePath("/dashboard/reports/stock-movements");
}

function nullable(value: string) {
  return value.trim() ? value.trim() : null;
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
