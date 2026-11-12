import { describe, expect, it } from "vitest";
import {
  alertDaysOrStoreDefault,
  buildProductQueryString,
  parseProductSearchParams,
  productToFormValues,
  validateBatchFields,
  validateDefaultAlertDays,
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
          discount_type: "",
          discount_value: "",
          discount_ends_at: "",
          expires_on: "",
          alert_days: "",
        },
        "create",
      ),
    ).toMatchObject({
      name: "Escribe el nombre del producto",
      price: "El precio tiene que ser mayor a 0",
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

describe("expiry fields", () => {
  it("validates the batch date and alert days", () => {
    expect(validateBatchFields("2026-12-31", "")).toEqual({});
    expect(validateBatchFields("2026-02-30", "")).toEqual({ expires_on: "Elige una fecha válida" });
    expect(validateBatchFields("2205-01-01", "")).toEqual({ expires_on: "Revisa el año de la fecha de vencimiento" });
    expect(validateBatchFields("2026-12-31", "366").alert_days).toMatch(/0 a 365/);
    expect(validateBatchFields("2026-12-31", "1.5").alert_days).toBeDefined();
  });

  it("only allows expiry on additions and a batch on deductions", () => {
    expect(validateStockAdjustment("-1", "merma", 5, { expiresOn: "2026-12-31" }).expires_on).toBeDefined();
    expect(validateStockAdjustment("3", "", 5, { batchId: "b1" }).batch_id).toBeDefined();
    expect(validateStockAdjustment("-3", "vencido", 5, { batchId: "b1", batchAvailable: 2 }).quantity).toBe(
      "Ese lote solo tiene 2 unidades",
    );
    expect(validateStockAdjustment("-2", "vencido", 5, { batchId: "b1", batchAvailable: 2 })).toEqual({});
  });

  it("requires initial stock when creating a product with expiry", () => {
    const values = { ...productToFormValues(), name: "Yogur", price: "5", stock: "0", expires_on: "2026-12-31" };
    expect(validateProductForm(values, "create").expires_on).toMatch(/stock inicial/);
    expect(validateProductForm({ ...values, stock: "4" }, "create")).toEqual({});
    // Al editar no se usa: los lotes entran con "Ajustar stock".
    expect(validateProductForm({ ...values, stock: "0" }, "edit")).toEqual({});
  });
});

describe("expiry fields", () => {
  it("validates the batch date and alert days", () => {
    expect(validateBatchFields("2026-12-31", "")).toEqual({});
    expect(validateBatchFields("2026-02-30", "")).toEqual({ expires_on: "Elige una fecha válida" });
    expect(validateBatchFields("2205-01-01", "")).toEqual({ expires_on: "Revisa el año de la fecha de vencimiento" });
    expect(validateBatchFields("2026-12-31", "366").alert_days).toMatch(/0 a 365/);
    expect(validateBatchFields("2026-12-31", "1.5").alert_days).toBeDefined();
  });

  it("only allows expiry on additions and a batch on deductions", () => {
    expect(validateStockAdjustment("-1", "merma", 5, { expiresOn: "2026-12-31" }).expires_on).toBeDefined();
    expect(validateStockAdjustment("3", "", 5, { batchId: "b1" }).batch_id).toBeDefined();
    expect(validateStockAdjustment("-3", "vencido", 5, { batchId: "b1", batchAvailable: 2 }).quantity).toBe(
      "Ese lote solo tiene 2 unidades",
    );
    expect(validateStockAdjustment("-2", "vencido", 5, { batchId: "b1", batchAvailable: 2 })).toEqual({});
  });

  it("requires initial stock when creating a product with expiry", () => {
    const values = { ...productToFormValues(), name: "Yogur", price: "5", stock: "0", expires_on: "2026-12-31" };
    expect(validateProductForm(values, "create").expires_on).toMatch(/stock inicial/);
    expect(validateProductForm({ ...values, stock: "4" }, "create")).toEqual({});
    // Al editar no se usa: los lotes entran con "Ajustar stock".
    expect(validateProductForm({ ...values, stock: "0" }, "edit")).toEqual({});
  });
});

describe("expiry alert days", () => {
  it("an empty field leaves the store default to the API (E11)", () => {
    expect(alertDaysOrStoreDefault("")).toBeNull();
    expect(alertDaysOrStoreDefault("0")).toBe(0);
    expect(alertDaysOrStoreDefault("12")).toBe(12);
  });

  it("the store default is a whole number from 0 to 365", () => {
    expect(validateDefaultAlertDays("")).toMatch(/cuántos días/);
    expect(validateDefaultAlertDays("0")).toBeNull();
    expect(validateDefaultAlertDays(" 365 ")).toBeNull();
    expect(validateDefaultAlertDays("366")).toMatch(/0 a 365/);
    expect(validateDefaultAlertDays("2.5")).toMatch(/0 a 365/);
    expect(validateDefaultAlertDays("-1")).toMatch(/0 a 365/);
  });
});
