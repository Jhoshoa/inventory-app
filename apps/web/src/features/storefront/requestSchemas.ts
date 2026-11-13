import { validateInternationalPhone } from "@/lib/format/phone";
import type { StorefrontRequestFormValues } from "./requestTypes";

export function validateStorefrontRequestForm(values: StorefrontRequestFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = values.customerName.trim();
  if (!name) {
    errors.customerName = "Tu nombre es requerido";
  } else if (name.length < 2) {
    errors.customerName = "Escribe un nombre válido";
  } else if (name.length > 150) {
    errors.customerName = "El nombre no puede exceder 150 caracteres";
  }

  const phone = values.customerPhone.trim();
  if (!phone) {
    errors.customerPhone = "Escribe tu teléfono para que te contacten";
  } else {
    const phoneError = validateInternationalPhone(phone);
    if (phoneError) errors.customerPhone = phoneError;
  }

  if (values.note.length > 500) {
    errors.note = "La nota no puede exceder 500 caracteres";
  }

  return errors;
}
