"use server";

import { revalidatePath } from "next/cache";
import { revalidateStorefrontCatalog } from "@/features/storefront/revalidate";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import { categoryConflictField, formDataToProductCategoryValues, validateProductCategoryForm } from "./schemas";
import type { ProductCategory, ProductCategoryActionState } from "./types";

/** Crea o edita (con `category_id`) una categoría. */
export async function saveProductCategoryAction(
  _previousState: ProductCategoryActionState,
  formData: FormData,
): Promise<ProductCategoryActionState> {
  const categoryId = stringValue(formData, "category_id");
  const values = formDataToProductCategoryValues(formData);
  const fieldErrors = validateProductCategoryForm(values);
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const token = await getAuthToken();
  const result = await apiRequest<ProductCategory>(
    categoryId ? `/product-categories/${categoryId}` : "/product-categories",
    { method: categoryId ? "PATCH" : "POST", token: token ?? undefined, body: values },
  );

  if (!result.ok) {
    const conflict = result.error.status === 409 ? categoryConflictField(result.error.message) : {};
    if (Object.keys(conflict).length > 0) return { ok: false, fieldErrors: conflict };
    return { ok: false, message: result.error.message, fieldErrors: {} };
  }

  revalidateCategoryPaths();
  await revalidateStorefrontCatalog();
  return {
    ok: true,
    message: categoryId ? "Categoría guardada" : "Categoría creada",
    category: result.data,
    fieldErrors: {},
  };
}

export async function deactivateProductCategoryAction(categoryId: string): Promise<ProductCategoryActionState> {
  if (!categoryId) return { ok: false, message: "Categoría inválida", fieldErrors: {} };

  const token = await getAuthToken();
  const result = await apiRequest<ProductCategory>(`/product-categories/${categoryId}/deactivate`, {
    method: "POST",
    token: token ?? undefined,
  });

  if (!result.ok) return { ok: false, message: result.error.message, fieldErrors: {} };

  revalidateCategoryPaths();
  await revalidateStorefrontCatalog();
  return { ok: true, message: "Categoría desactivada", category: result.data, fieldErrors: {} };
}

function revalidateCategoryPaths() {
  // Lista, formularios y la pestaña Categorías (todo bajo /dashboard/products).
  revalidatePath("/dashboard/products", "layout");
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
