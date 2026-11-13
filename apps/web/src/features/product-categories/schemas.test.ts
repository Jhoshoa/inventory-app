import { describe, expect, it } from "vitest";
import { categoryConflictField, formDataToProductCategoryValues, nextSku, suggestSkuPrefix, validateProductCategoryForm } from "./schemas";

describe("product category schemas", () => {
  it("cleans the name and upper-cases the prefix", () => {
    const data = new FormData();
    data.set("name", "  Lácteos   y   huevos ");
    data.set("sku_prefix", " lac ");
    expect(formDataToProductCategoryValues(data)).toEqual({ name: "Lácteos y huevos", sku_prefix: "LAC" });
  });

  it("validates name and prefix like the API", () => {
    expect(validateProductCategoryForm({ name: "", sku_prefix: "" })).toEqual({
      name: "Escribe el nombre",
      sku_prefix: "Escribe el prefijo del SKU",
    });
    expect(validateProductCategoryForm({ name: "x".repeat(81), sku_prefix: "ABCDEFGHI" })).toEqual({
      name: "Máximo 80 caracteres",
      sku_prefix: "Máximo 8 caracteres",
    });
    expect(validateProductCategoryForm({ name: "Pan", sku_prefix: "PA-N" }).sku_prefix).toMatch(/Solo letras y números/);
    expect(validateProductCategoryForm({ name: "Pan", sku_prefix: "PAN1" })).toEqual({});
  });

  it("puts a 409 on the field that is repeated", () => {
    expect(categoryConflictField("Ya existe una categoria con ese prefijo SKU")).toEqual({
      sku_prefix: "Ya existe una categoría con ese prefijo SKU.",
    });
    expect(categoryConflictField("Ya existe una categoria con ese nombre")).toEqual({
      name: "Ya existe una categoría con ese nombre.",
    });
    expect(categoryConflictField("Otro conflicto")).toEqual({});
  });

  it("builds the next SKU with 6 digits", () => {
    expect(nextSku({ sku_prefix: "LAC", next_sku_number: 5 })).toBe("LAC000005");
  });

  it("suggests a prefix from the name", () => {
    expect(suggestSkuPrefix("Pan integral")).toBe("PAN");
    expect(suggestSkuPrefix("Lácteos")).toBe("LAC");
    expect(suggestSkuPrefix("  ñ 1 a")).toBe("N1A");
    expect(suggestSkuPrefix("")).toBe("");
  });
});
