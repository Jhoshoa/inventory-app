import type { AcceptInvitationFormValues, InviteCashierFormValues } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export function validateInviteCashierForm(values: InviteCashierFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.email.trim()) {
    errors.email = "El email es requerido";
  } else if (!EMAIL_RE.test(values.email)) {
    errors.email = "Email invalido";
  }

  if (values.role !== "owner" && values.role !== "cashier") {
    errors.role = "Rol invalido";
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
