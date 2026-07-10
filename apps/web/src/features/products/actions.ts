"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import {
  formDataToProductValues,
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
    return {
      ok: false,
      message: result.error.message,
      values,
      fieldErrors: {},
    };
  }

  const photoEntry = findPhotoFile(formData);
  if (photoEntry) {
    try {
      const baseUrl = process.env.BACKEND_API_URL || "http://localhost:8001";
      const uploadForm = new FormData();
      uploadForm.append("file", new Blob([await photoEntry.bytes()], { type: photoEntry.type || "image/jpeg" }), "photo.jpg");
      await fetch(
        `${baseUrl}/api/v1/products/${result.data.id}/photo`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: uploadForm,
        },
      );
    } catch {
      // photo upload failure is non-blocking; product was already created
    }
  }

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${result.data.id}`);
  redirect(`/dashboard/products/${result.data.id}`);
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
    return { ok: false, message: result.error.message, fieldErrors: {}, values };
  }

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${productId}`);
  redirect(`/dashboard/products/${productId}`);
}

export async function adjustStockAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const productId = stringValue(formData, "product_id");
  const quantity = stringValue(formData, "quantity");
  const reason = stringValue(formData, "reason");
  const fieldErrors = validateStockAdjustment(quantity, reason);

  if (!productId) return { ok: false, message: "Producto invalido", fieldErrors: {} };
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const token = await getAuthToken();
  const result = await apiRequest<Product>(`/products/${productId}/stock`, {
    method: "PATCH",
    token: token ?? undefined,
    body: {
      quantity: Number(quantity),
      reason: reason || null,
    },
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

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

  revalidatePath("/dashboard/products");
  return { ok: true, message: "Producto eliminado", fieldErrors: {} };
}

function createPayload(values: ReturnType<typeof formDataToProductValues>) {
  return {
    name: values.name,
    price: values.price,
    stock: Number(values.stock),
    category_id: nullable(values.category_id),
    category: nullable(values.category),
    min_stock: values.min_stock ? Number(values.min_stock) : 5,
    unit: values.unit || "unidad",
    sku: nullable(values.sku),
    cost_price: values.cost_price ? values.cost_price : null,
    photo_url: null,
    qr_code: nullable(values.qr_code),
  };
}

function updatePayload(values: ReturnType<typeof formDataToProductValues>) {
  return {
    name: values.name,
    price: values.price,
    category_id: nullable(values.category_id),
    category: nullable(values.category),
    min_stock: values.min_stock ? Number(values.min_stock) : 5,
    unit: values.unit || "unidad",
    sku: nullable(values.sku),
    cost_price: values.cost_price ? values.cost_price : null,
    photo_url: null,
    qr_code: nullable(values.qr_code),
  };
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
