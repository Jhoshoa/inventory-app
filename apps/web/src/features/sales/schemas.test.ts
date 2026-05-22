import { describe, expect, it } from "vitest";
import { buildSalesApiQuery, parseSalesSearchParams, validateVoidSale } from "./schemas";

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

describe("sales search params", () => {
  it("applies safe defaults", () => {
    expect(parseSalesSearchParams({ status: "bad", limit: "999", offset: "-1" })).toEqual({
      from_date: undefined,
      to_date: undefined,
      status: "all",
      limit: 100,
      offset: 0,
    });
  });

  it("serializes date-only backend query params", () => {
    expect(
      buildSalesApiQuery({
        from_date: "2026-05-01",
        to_date: "2026-05-22",
        status: "completed",
        limit: 50,
        offset: 0,
      }),
    ).toBe("from_date=2026-05-01&to_date=2026-05-22&status=completed&limit=50&offset=0");
  });
});
