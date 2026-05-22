import type { ProductCategoryFormValues } from "./types";

export function validateProductCategoryForm(values: ProductCategoryFormValues) {
  const errors: Partial<Record<keyof ProductCategoryFormValues, string>> = {};
  const prefix = values.sku_prefix.trim();

  if (!values.name.trim()) errors.name = "Nombre es requerido";
  else if (values.name.trim().length > 80) errors.name = "Nombre debe tener maximo 80 caracteres";

  if (!prefix) errors.sku_prefix = "Prefijo SKU es requerido";
  else if (prefix.length > 8) errors.sku_prefix = "Prefijo SKU debe tener maximo 8 caracteres";
  else if (!/^[a-z0-9]+$/i.test(prefix)) {
    errors.sku_prefix = "Prefijo SKU solo puede tener letras y numeros";
  }

  return errors;
}

export function formDataToProductCategoryValues(formData: FormData): ProductCategoryFormValues {
  return {
    name: stringValue(formData, "name"),
    sku_prefix: stringValue(formData, "sku_prefix").toUpperCase(),
  };
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
