import type { DiscountPolicyFormValues, StoreFormValues, StorefrontFormValues } from "./types";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

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

export function validateStorefrontForm(values: StorefrontFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  const slug = values.slug.trim();
  if (values.enabled && !slug) {
    errors.slug = "Define un slug antes de activar el catalogo publico";
  } else if (slug && !SLUG_RE.test(slug)) {
    errors.slug = "Solo minusculas, numeros y guiones, sin empezar ni terminar en guion (min. 3 caracteres)";
  }

  if (values.colorPrimary && !HEX_COLOR_RE.test(values.colorPrimary)) {
    errors.colorPrimary = "Ingresa un color hex valido, ej. #2563EB";
  }
  if (values.colorSecondary && !HEX_COLOR_RE.test(values.colorSecondary)) {
    errors.colorSecondary = "Ingresa un color hex valido, ej. #2563EB";
  }

  if (values.description.length > 280) {
    errors.description = "La descripcion no puede exceder 280 caracteres";
  }

  if (values.logoUrl && values.logoUrl.length > 500) {
    errors.logoUrl = "La URL no puede exceder 500 caracteres";
  }
  if (values.bannerUrl && values.bannerUrl.length > 500) {
    errors.bannerUrl = "La URL no puede exceder 500 caracteres";
  }

  if (values.paymentInstructions.length > 280) {
    errors.paymentInstructions = "Las instrucciones no pueden exceder 280 caracteres";
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
