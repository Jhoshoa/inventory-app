import { WEEKDAYS, type StorefrontSettings } from "@/features/storefront/settings";
import { validateInternationalPhone } from "@/lib/format/phone";
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

  const phoneError = validateInternationalPhone(values.phone ?? "");
  if (phoneError) errors.phone = phoneError;

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

  // Codigo de pais + numero: wa.me no abre el chat con un numero local.
  const whatsappError = validateInternationalPhone(values.whatsapp);
  if (whatsappError) errors.whatsapp = whatsappError;

  if (values.paymentInstructions.length > 280) {
    errors.paymentInstructions = "Las instrucciones no pueden exceder 280 caracteres";
  }

  return { ...errors, ...validateStorefrontSettings(values.settings) };
}

const MAPS_URL_RE = /^(https?:\/\/)?(maps\.app\.goo\.gl\/|maps\.google\.com\/|(www\.)?google\.com\/maps|goo\.gl\/maps)/i;

/** Lo mismo que valida StorefrontSettingsDTO en el backend, para avisar antes de enviar. */
export function validateStorefrontSettings(settings: StorefrontSettings): Record<string, string> {
  const errors: Record<string, string> = {};

  const announcement = settings.announcement_text ?? "";
  if (settings.announcement_enabled && !announcement) {
    errors.announcementText = "Escribe el texto de la cinta de anuncio o desactivala";
  } else if (announcement.length > 140) {
    errors.announcementText = "El anuncio no puede exceder 140 caracteres";
  }

  if ((settings.address ?? "").length > 200) {
    errors.address = "La direccion no puede exceder 200 caracteres";
  }
  if (settings.maps_url && !MAPS_URL_RE.test(settings.maps_url)) {
    errors.mapsUrl = "Pega el link que te da Google Maps al tocar Compartir";
  }

  if (settings.featured_product_ids.length > 10) {
    errors.featured = "Puedes destacar hasta 10 productos";
  }

  settings.hours?.forEach((day, index) => {
    if (!day.is_open) return;
    if (!day.opens_at || !day.closes_at) {
      errors[`hours.${index}`] = `${WEEKDAYS[index]}: indica la hora de apertura y de cierre`;
    } else if (day.opens_at === day.closes_at) {
      errors[`hours.${index}`] = `${WEEKDAYS[index]}: la apertura y el cierre no pueden ser iguales`;
    }
  });

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
