import type { StorefrontRequestFormValues } from "./requestTypes";

const PHONE_RE = /^[0-9+\s()-]{7,30}$/;

export function validateStorefrontRequestForm(values: StorefrontRequestFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = values.customerName.trim();
  if (!name) {
    errors.customerName = "Tu nombre es requerido";
  } else if (name.length < 2) {
    errors.customerName = "Ingresa un nombre valido";
  } else if (name.length > 150) {
    errors.customerName = "El nombre no puede exceder 150 caracteres";
  }

  const phone = values.customerPhone.trim();
  if (!phone) {
    errors.customerPhone = "Tu telefono es requerido para que te contacten";
  } else if (!PHONE_RE.test(phone)) {
    errors.customerPhone = "Ingresa un telefono valido";
  }

  // La forma de entrega se suma a la nota: el limite de 500 es del total.
  if (values.note.length > 470) {
    errors.note = "La nota no puede exceder 470 caracteres";
  }

  return errors;
}
