import type { DiscountPolicyFormValues, StoreFormValues } from "./types";

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

export function validateDiscountPolicyForm(values: DiscountPolicyFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  const maxPercentage = Number(values.maxPercentageDiscount);
  if (values.maxPercentageDiscount.trim() && (Number.isNaN(maxPercentage) || maxPercentage < 0 || maxPercentage > 100)) {
    errors.maxPercentageDiscount = "Ingresa un porcentaje entre 0 y 100";
  } else if (values.allowPercentageDiscount && (!maxPercentage || maxPercentage <= 0)) {
    errors.maxPercentageDiscount = "Define un porcentaje maximo mayor a 0 para habilitar esta opcion";
  }

  const maxAmount = Number(values.maxManualDiscountAmount);
  if (values.maxManualDiscountAmount.trim() && (Number.isNaN(maxAmount) || maxAmount < 0)) {
    errors.maxManualDiscountAmount = "Ingresa un monto valido";
  } else if (values.allowManualDiscount && (!maxAmount || maxAmount <= 0)) {
    errors.maxManualDiscountAmount = "Define un monto maximo mayor a 0 para habilitar esta opcion";
  }

  return errors;
}
