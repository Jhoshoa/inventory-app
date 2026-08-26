import type { ContactFormValues } from "./types";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^[0-9+\s()-]{7,30}$/;

export function validateContactForm(values: ContactFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.name.trim()) {
    errors.name = "Tu nombre es requerido";
  } else if (values.name.trim().length < 2) {
    errors.name = "Ingresa un nombre valido";
  } else if (values.name.trim().length > 150) {
    errors.name = "El nombre no puede exceder 150 caracteres";
  }

  if (!values.phone.trim()) {
    errors.phone = "Tu telefono es requerido para poder contactarte";
  } else if (!PHONE_RE.test(values.phone.trim())) {
    errors.phone = "Ingresa un telefono valido";
  }

  if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
    errors.email = "Ingresa un correo valido";
  }

  if (values.storeName.length > 150) {
    errors.storeName = "El nombre de la tienda no puede exceder 150 caracteres";
  }

  if (values.message.length > 1000) {
    errors.message = "El mensaje no puede exceder 1000 caracteres";
  }

  return errors;
}
