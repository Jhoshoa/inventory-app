import { describe, expect, it } from "vitest";
import {
  buildProductQueryString,
  parseProductSearchParams,
  validateProductForm,
  validateStockAdjustment,
} from "./schemas";

describe("parseProductSearchParams", () => {
  it("applies defaults for invalid values", () => {
    expect(
      parseProductSearchParams({
        q: "ar",
        stock: "bad",
        limit: "999",
        offset: "-1",
        sort: "unknown",
        direction: "sideways",
      }),
    ).toEqual({
      q: undefined,
      category: undefined,
      stock: "all",
      limit: 100,
      offset: 0,
      sort: "name",
      direction: "asc",
    });
  });

  it("accepts search text with at least three characters", () => {
    expect(parseProductSearchParams({ q: " arr " }).q).toBe("arr");
  });
});

describe("buildProductQueryString", () => {
  it("serializes filters", () => {
    expect(
      buildProductQueryString({
        q: "arroz",
        category: "abarrotes",
        stock: "low",
        limit: 50,
        offset: 0,
        sort: "stock",
        direction: "desc",
      }),
    ).toBe("q=arroz&category=abarrotes&stock=low&limit=50&offset=0&sort=stock&direction=desc");
  });

  it("omits short search text", () => {
    expect(
      buildProductQueryString({
        q: "ar",
        category: undefined,
        stock: "all",
        limit: 50,
        offset: 0,
        sort: "name",
        direction: "asc",
      }),
    ).toBe("stock=all&limit=50&offset=0&sort=name&direction=asc");
  });
});

describe("validateProductForm", () => {
  it("rejects missing name and non-positive price", () => {
    expect(
      validateProductForm(
        {
          name: "",
          price: "0",
          stock: "1",
          category_id: "",
          category: "",
          min_stock: "5",
          unit: "unidad",
          sku: "",
          cost_price: "",
          qr_code: "",
          photo_url: "",
        },
        "create",
      ),
    ).toMatchObject({
      name: "Nombre es requerido",
      price: "Precio debe ser mayor a 0",
    });
  });
});

describe("validateStockAdjustment", () => {
  it("rejects zero quantity", () => {
    expect(validateStockAdjustment("0", "")).toEqual({
      quantity: "Cantidad debe ser un entero distinto de 0",
    });
  });

  it("requires reason for negative adjustments", () => {
    expect(validateStockAdjustment("-2", "")).toEqual({
      reason: "La razon es requerida para descontar stock",
    });
  });
});
