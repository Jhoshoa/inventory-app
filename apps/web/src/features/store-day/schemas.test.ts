import { describe, expect, it } from "vitest";
import { moneyValue, validateMoneyAmount, validateVoidReason } from "./schemas";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("validateMoneyAmount", () => {
  it("acepta coma o punto como decimal", () => {
    expect(validateMoneyAmount("30,50", "Monto", { required: true })).toBe("");
    expect(validateMoneyAmount("30.50", "Monto", { required: true })).toBe("");
    expect(validateMoneyAmount("30,5", "Monto", { required: true })).toBe("");
  });

  it("permite 0 en apertura y contado, no en un movimiento", () => {
    expect(validateMoneyAmount("0", "Caja inicial", { allowZero: true })).toBe("");
    expect(validateMoneyAmount("0,00", "Efectivo contado", { required: true, allowZero: true })).toBe("");
    expect(validateMoneyAmount("0", "Monto", { required: true })).toBe("Monto debe ser mayor a 0");
  });

  it("requerido solo cuando se pide", () => {
    expect(validateMoneyAmount("", "Caja inicial", { allowZero: true })).toBe("");
    expect(validateMoneyAmount(null, "Caja inicial")).toBe("");
    expect(validateMoneyAmount("  ", "Monto", { required: true })).toBe("Monto es requerido");
  });

  it("rechaza formatos que la API no acepta", () => {
    const message = "Monto debe ser un número con hasta 2 decimales (ej. 30,50)";
    expect(validateMoneyAmount("30,505", "Monto", { required: true })).toBe(message);
    expect(validateMoneyAmount("1.234,50", "Monto", { required: true })).toBe(message);
    expect(validateMoneyAmount("-5", "Monto", { required: true })).toBe(message);
    expect(validateMoneyAmount("abc", "Monto", { required: true })).toBe(message);
    expect(validateMoneyAmount("12345678901", "Monto", { required: true })).toBe(
      "Monto supera el máximo de 10 dígitos",
    );
  });
});

describe("moneyValue", () => {
  it("envía el monto con punto", () => {
    expect(moneyValue(form({ amount: "30,50" }), "amount")).toBe("30.50");
    expect(moneyValue(form({ amount: " 12 " }), "amount")).toBe("12");
    expect(moneyValue(form({ amount: "0" }), "amount")).toBe("0");
  });

  it("vacío o sin campo es null", () => {
    expect(moneyValue(form({ amount: "" }), "amount")).toBeNull();
    expect(moneyValue(form({}), "amount")).toBeNull();
  });
});

describe("validateVoidReason", () => {
  it("es obligatoria", () => {
    expect(validateVoidReason("")).toBe("Escribe por qué anulas el movimiento");
    expect(validateVoidReason("   ")).toBe("Escribe por qué anulas el movimiento");
    expect(validateVoidReason(null)).toBe("Escribe por qué anulas el movimiento");
  });

  it("máximo 255 caracteres", () => {
    expect(validateVoidReason("a".repeat(255))).toBe("");
    expect(validateVoidReason("a".repeat(256))).toBe("La razón debe tener máximo 255 caracteres");
  });
});
