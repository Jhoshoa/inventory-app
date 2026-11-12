import { describe, expect, it } from "vitest";
import { automaticCodeHint, discountPolicyFromStore, discountedPrice, margin, productApiFieldErrors, shortDate } from "./form";
import { productToFormValues, validateProductForm } from "./schemas";

describe("product form helpers", () => {
  it("shows the profit over the sale price", () => {
    expect(margin("18,50", "12")).toEqual({ amount: 6.5, percent: 35 });
    expect(margin("10", "12,00")).toEqual({ amount: -2, percent: -20 });
    expect(margin("10", "")).toBeNull();
    expect(margin("", "5")).toBeNull();
  });

  it("computes the price with discount like the API", () => {
    expect(discountedPrice("6,50", "percentage", "10")).toBe(5.85);
    expect(discountedPrice("4", "fixed", "0,80")).toBe(3.2);
    expect(discountedPrice("4", "", "1")).toBeNull();
    expect(discountedPrice("4", "fixed", "")).toBeNull();
  });

  it("reads the store discount policy", () => {
    expect(
      discountPolicyFromStore({
        allow_percentage_discount: true,
        max_percentage_discount: "15.00",
        allow_manual_discount: false,
        max_manual_discount_amount: "0",
      }),
    ).toEqual({ percentage: { allowed: true, max: 15 }, fixed: { allowed: false, max: 0 } });
  });

  it("puts API conflicts on their field", () => {
    expect(productApiFieldErrors(409, "El SKU ya esta en uso por otro producto")).toEqual({ sku: "Ese SKU ya lo tiene otro producto." });
    expect(productApiFieldErrors(409, "El codigo escaneable ya esta en uso por otro producto").qr_code).toMatch(/en uso/);
    expect(productApiFieldErrors(409, "Ya existe un producto con el nombre 'Leche' y unidad 'unidad'").name).toMatch(/nombre y esa unidad/);
    expect(productApiFieldErrors(403, "El descuento maximo permitido es 15%")).toEqual({
      discount_value: "El descuento máximo permitido es 15%",
    });
    expect(productApiFieldErrors(404, "Categoria no encontrada").category_id).toMatch(/Elige otra/);
    expect(productApiFieldErrors(500, "Error")).toEqual({});
  });

  it("explains the automatic scan code", () => {
    expect(automaticCodeHint("LAC000005")).toBe("Vacío: se crea uno a partir del SKU (QR-LAC000005).");
    expect(automaticCodeHint(null)).toMatch(/al azar/);
    expect(shortDate("2026-12-02")).toBe("02/12");
  });
});

describe("product form validation", () => {
  const base = { ...productToFormValues(), name: "Leche Pil", price: "7,50", stock: "10" };
  const policy = { percentage: { allowed: true, max: 15 }, fixed: { allowed: false, max: 0 } };

  it("accepts amounts with comma and asks for the right format", () => {
    expect(validateProductForm(base, "create")).toEqual({});
    expect(validateProductForm({ ...base, price: "1.234,50" }, "create").price).toBe("Escribe el precio como 18,50");
    expect(validateProductForm({ ...base, price: "" }, "create").price).toBe("Escribe el precio de venta");
    expect(validateProductForm({ ...base, cost_price: "abc" }, "create").cost_price).toMatch(/12,00/);
    expect(validateProductForm({ ...base, stock: "" }, "create").stock).toMatch(/puede ser 0/);
    expect(validateProductForm({ ...base, stock: "2.5" }, "create").stock).toMatch(/entero/);
  });

  it("checks discounts against the store policy", () => {
    expect(validateProductForm({ ...base, discount_type: "percentage", discount_value: "20" }, "edit", policy).discount_value).toBe(
      "El máximo de la tienda es 15%",
    );
    expect(validateProductForm({ ...base, discount_type: "percentage", discount_value: "10" }, "edit", policy)).toEqual({});
    expect(validateProductForm({ ...base, discount_type: "fixed", discount_value: "1" }, "edit", policy).discount_value).toBe(
      "La tienda no permite rebajas en Bs",
    );
    expect(validateProductForm({ ...base, discount_type: "fixed", discount_value: "7,50" }, "edit").discount_value).toMatch(/menor al precio/);
    expect(validateProductForm({ ...base, discount_type: "percentage", discount_value: "120" }, "edit").discount_value).toMatch(/100/);
    expect(validateProductForm({ ...base, discount_ends_at: "2030-01-01" }, "edit").discount_ends_at).toMatch(/solo va con un descuento/);
  });
});
