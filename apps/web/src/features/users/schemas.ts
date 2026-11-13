import { passwordMeetsRules } from "@/features/auth/passwordRules";
import type { AcceptInvitationFormValues, InviteCashierFormValues } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    errors.full_name = "Escribe tu nombre";
  }

  if (!passwordMeetsRules(values.password)) {
    errors.password = "La contraseña todavía no cumple los requisitos";
  }

  return errors;
}
