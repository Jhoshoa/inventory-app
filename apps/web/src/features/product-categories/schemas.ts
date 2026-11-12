import type { ProductCategory, ProductCategoryFormValues } from "./types";

export const CATEGORY_LIMITS = { name: 80, sku_prefix: 8 } as const;

export function validateProductCategoryForm(values: ProductCategoryFormValues) {
  const errors: Partial<Record<keyof ProductCategoryFormValues, string>> = {};
  const prefix = values.sku_prefix.trim();

  if (!values.name.trim()) errors.name = "Escribe el nombre";
  else if (values.name.trim().length > CATEGORY_LIMITS.name) errors.name = `Máximo ${CATEGORY_LIMITS.name} caracteres`;

  if (!prefix) errors.sku_prefix = "Escribe el prefijo del SKU";
  else if (prefix.length > CATEGORY_LIMITS.sku_prefix) errors.sku_prefix = `Máximo ${CATEGORY_LIMITS.sku_prefix} caracteres`;
  else if (!/^[a-z0-9]+$/i.test(prefix)) errors.sku_prefix = "Solo letras y números, sin espacios";

  return errors;
}

export function formDataToProductCategoryValues(formData: FormData): ProductCategoryFormValues {
  return {
    name: stringValue(formData, "name").replace(/\s+/g, " "),
    sku_prefix: stringValue(formData, "sku_prefix").toUpperCase(),
  };
}

/** La API responde 409 con un mensaje; se muestra en el campo que corresponde (P01B). */
export function categoryConflictField(message: string): Partial<Record<keyof ProductCategoryFormValues, string>> {
  const text = message.toLowerCase();
  if (text.includes("prefijo")) return { sku_prefix: "Ya existe una categoría con ese prefijo SKU." };
  if (text.includes("nombre")) return { name: "Ya existe una categoría con ese nombre." };
  return {};
}

/** "LAC000005": prefijo + próximo número con 6 dígitos, como lo arma la API. */
export function nextSku(category: Pick<ProductCategory, "sku_prefix" | "next_sku_number">) {
  return `${category.sku_prefix}${String(category.next_sku_number).padStart(6, "0")}`;
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
