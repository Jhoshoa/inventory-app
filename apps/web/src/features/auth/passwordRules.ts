/** Mismas reglas que el backend (RegisterDTO / ResetPasswordDTO). */
export const PASSWORD_HINT =
  "Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.";

export function passwordStrengthError(password: string): string | undefined {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (!/(?=.*[a-z])/.test(password)) return "La contraseña debe tener al menos una minúscula";
  if (!/(?=.*[A-Z])/.test(password)) return "La contraseña debe tener al menos una mayúscula";
  if (!/(?=.*\d)/.test(password)) return "La contraseña debe tener al menos un número";
  if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?])/.test(password)) {
    return "La contraseña debe tener al menos un carácter especial";
  }
  return undefined;
}
