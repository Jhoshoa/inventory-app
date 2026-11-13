/** Mismas reglas que el backend (RegisterDTO / ResetPasswordDTO / aceptar invitación). */
export const PASSWORD_HINT =
  "Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.";

const SYMBOL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

/** La lista que se marca mientras se escribe (tablero P13). */
export const PASSWORD_RULES: { key: string; label: string; test: (password: string) => boolean }[] = [
  { key: "length", label: "8 caracteres o más", test: (password) => password.length >= 8 },
  { key: "upper", label: "Una mayúscula", test: (password) => /[A-Z]/.test(password) },
  { key: "lower", label: "Una minúscula", test: (password) => /[a-z]/.test(password) },
  { key: "digit", label: "Un número", test: (password) => /\d/.test(password) },
  { key: "symbol", label: "Un símbolo (!@#…)", test: (password) => SYMBOL.test(password) },
];

export function passwordMeetsRules(password: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function passwordStrengthError(password: string): string | undefined {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (!/(?=.*[a-z])/.test(password)) return "La contraseña debe tener al menos una minúscula";
  if (!/(?=.*[A-Z])/.test(password)) return "La contraseña debe tener al menos una mayúscula";
  if (!/(?=.*\d)/.test(password)) return "La contraseña debe tener al menos un número";
  if (!SYMBOL.test(password)) return "La contraseña debe tener al menos un carácter especial";
  return undefined;
}
