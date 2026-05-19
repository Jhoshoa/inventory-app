import { describe, expect, it } from "vitest";
import { validateVoidSale } from "./schemas";

describe("validateVoidSale", () => {
  it("requires a reason", () => {
    expect(validateVoidSale("   ")).toEqual({ reason: "La razon es requerida" });
  });

  it("limits reason length", () => {
    expect(validateVoidSale("x".repeat(201))).toEqual({
      reason: "La razon debe tener maximo 200 caracteres",
    });
  });

  it("accepts a valid reason", () => {
    expect(validateVoidSale("Producto devuelto")).toEqual({});
  });
});
