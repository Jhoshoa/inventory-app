import type { AcceptInvitationFormValues, InviteCashierFormValues } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export function validateInviteCashierForm(values: InviteCashierFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.email.trim()) {
    errors.email = "Escribe el correo de la persona";
  } else if (!EMAIL_RE.test(values.email)) {
    errors.email = "Ese correo no es válido. Ej.: ana@correo.com";
  }

  if (values.role !== "owner" && values.role !== "cashier") {
    errors.role = "Elige Cajero o Dueño";
  }

  return errors;
}

export function validateAcceptInvitationForm(values: AcceptInvitationFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.full_name.trim()) {
    errors.full_name = "Nombre completo es requerido";
  }

  if (!values.password) {
    errors.password = "Contraseña es requerida";
  } else if (!PASSWORD_RE.test(values.password)) {
    errors.password =
      "Minimo 8 caracteres, con mayuscula, minuscula, numero y caracter especial";
  }

  return errors;
}
