import type { StoreFormValues } from "./types";

export function validateStoreForm(values: StoreFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.name.trim()) {
    errors.name = "El nombre de la tienda es requerido";
  } else if (values.name.trim().length > 100) {
    errors.name = "El nombre no puede exceder 100 caracteres";
  }

  if (values.address && values.address.length > 255) {
    errors.address = "La direccion no puede exceder 255 caracteres";
  }

  if (values.phone && values.phone.length > 20) {
    errors.phone = "El telefono no puede exceder 20 caracteres";
  }

  return errors;
}
