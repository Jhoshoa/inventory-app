import { describe, expect, it } from "vitest";
import { passwordStrengthError } from "./passwordRules";

describe("passwordStrengthError", () => {
  it("acepta una contraseña que cumple todas las reglas", () => {
    expect(passwordStrengthError("NuevaClave1!")).toBeUndefined();
  });

  it.each([
    ["Ab1!", "al menos 8 caracteres"],
    ["MAYUS123!", "una minúscula"],
    ["minus123!", "una mayúscula"],
    ["Sinnumero!", "un número"],
    ["SinEspecial1", "un carácter especial"],
  ])("rechaza %s", (password, expected) => {
    expect(passwordStrengthError(password)).toContain(expected);
  });
});
