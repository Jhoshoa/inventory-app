"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import { formDataToProductCategoryValues, validateProductCategoryForm } from "./schemas";
import type { ProductCategory, ProductCategoryActionState } from "./types";

export async function createProductCategoryAction(
  _previousState: ProductCategoryActionState,
  formData: FormData,
): Promise<ProductCategoryActionState> {
  const values = formDataToProductCategoryValues(formData);
  const fieldErrors = validateProductCategoryForm(values);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const token = await getAuthToken();
  const result = await apiRequest<ProductCategory>("/product-categories", {
    method: "POST",
    token: token ?? undefined,
    body: values,
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  revalidateCategoryPaths();
  return { ok: true, message: "Categoria creada", fieldErrors: {} };
}

export async function deactivateProductCategoryAction(
  _previousState: ProductCategoryActionState,
  formData: FormData,
): Promise<ProductCategoryActionState> {
  const categoryId = stringValue(formData, "category_id");
  if (!categoryId) return { ok: false, message: "Categoria invalida", fieldErrors: {} };

  const token = await getAuthToken();
  const result = await apiRequest<ProductCategory>(`/product-categories/${categoryId}/deactivate`, {
    method: "POST",
    token: token ?? undefined,
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  revalidateCategoryPaths();
  return { ok: true, message: "Categoria desactivada", fieldErrors: {} };
}

function revalidateCategoryPaths() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/products/new");
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
