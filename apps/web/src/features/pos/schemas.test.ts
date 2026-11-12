import { describe, expect, it } from "vitest";
import {
  calculateCartTotal,
  calculateDiscountAmount,
  changeDue,
  initialCartState,
  posCartReducer,
  quickCashAmounts,
  receiptText,
  resolveDiscount,
  validateCheckout,
  validateManualDiscount,
} from "./schemas";
import type { CartItem, PosProduct } from "./types";

const product: PosProduct = {
  id: "product-1",
  name: "Arroz 1kg",
  price: "12.50",
  stock: 2,
  unit: "unidad",
  qr_code: "QR-1",
  discount_type: null,
  discount_value: "0",
  effective_price: "12.50",
};

describe("posCartReducer", () => {
  it("adds products and caps increments at available stock", () => {
    const withProduct = posCartReducer(initialCartState, { type: "add", product });
    const incremented = posCartReducer(withProduct, {
      type: "increment",
      productId: product.id,
    });
    const capped = posCartReducer(incremented, {
      type: "increment",
      productId: product.id,
    });

    expect(capped.items).toHaveLength(1);
    expect(capped.items[0]?.quantity).toBe(2);
  });

  it("removes an item when decrement reaches zero", () => {
    const withProduct = posCartReducer(initialCartState, { type: "add", product });
    const empty = posCartReducer(withProduct, {
      type: "decrement",
      productId: product.id,
    });

    expect(empty.items).toEqual([]);
  });

  it("sets typed quantities and rejects invalid direct values", () => {
    const withProduct = posCartReducer(initialCartState, { type: "add", product });
    const setToTwo = posCartReducer(withProduct, {
      type: "setQuantity",
      productId: product.id,
      quantity: 2,
    });
    const overStock = posCartReducer(setToTwo, {
      type: "setQuantity",
      productId: product.id,
      quantity: 50,
    });
    const zero = posCartReducer(overStock, {
      type: "setQuantity",
      productId: product.id,
      quantity: 0,
    });

    expect(setToTwo.items[0]?.quantity).toBe(2);
    expect(overStock.items[0]?.quantity).toBe(product.stock);
    expect(zero.items[0]?.quantity).toBe(product.stock);
  });

  it("syncs refreshed product stock without changing cart quantities", () => {
    const withProduct = posCartReducer(initialCartState, { type: "add", product });
    const setToTwo = posCartReducer(withProduct, {
      type: "setQuantity",
      productId: product.id,
      quantity: 2,
    });
    const refreshed = posCartReducer(setToTwo, {
      type: "syncProducts",
      products: [{ ...product, stock: 1 }],
    });

    expect(refreshed.items[0]?.quantity).toBe(2);
    expect(refreshed.items[0]?.product.stock).toBe(1);
  });
});

describe("checkout helpers", () => {
  it("calculates totals from decimal prices", () => {
    const items: CartItem[] = [{ product, quantity: 2 }];

    expect(calculateCartTotal(items)).toBe(25);
  });

  it("validates empty carts and stock overages", () => {
    expect(validateCheckout([])).toEqual({
      items: "Agrega al menos un producto",
    });
    expect(validateCheckout([{ product, quantity: 3 }])).toEqual({
      items: "Arroz 1kg: quedan 2 y llevas 3",
    });
  });

  it("validates payment methods", () => {
    expect(validateCheckout([{ product, quantity: 1 }], "crypto")).toEqual({
      payment_method: "Elige cómo te pagan",
    });
  });
});

describe("cobro", () => {
  const policy = {
    allow_percentage_discount: true,
    max_percentage_discount: "15",
    allow_manual_discount: true,
    max_manual_discount_amount: "10",
    allow_cashier_discount_override: false,
  };

  it("gives the change or says how much is missing", () => {
    expect(changeDue("50", 46.2)).toEqual({ change: 3.8, missing: 0 });
    expect(changeDue("46,20", 46.2)).toEqual({ change: 0, missing: 0 });
    expect(changeDue("40", 46.2)).toEqual({ change: 0, missing: 6.2 });
    expect(changeDue("", 46.2)).toBeNull();
    expect(changeDue("abc", 46.2)).toBeNull();
  });

  it("offers exact and the next notes", () => {
    expect(quickCashAmounts(46.2)).toEqual({ exact: 46.2, notes: [50, 100] });
    expect(quickCashAmounts(150)).toEqual({ exact: 150, notes: [200] });
    expect(quickCashAmounts(8)).toEqual({ exact: 8, notes: [10, 20] });
  });

  it("checks the manual discount against the store limits", () => {
    expect(validateManualDiscount("", "", 100, policy)).toBeNull();
    expect(validateManualDiscount("percentage", "20", 100, policy)).toBe("El máximo es 15%");
    expect(validateManualDiscount("percentage", "12,5", 100, policy)).toBeNull();
    expect(validateManualDiscount("fixed", "12", 100, policy)).toMatch(/El máximo es Bs/);
    expect(validateManualDiscount("fixed", "8", 5, policy)).toBe("La rebaja no puede ser mayor que el subtotal");
    expect(validateManualDiscount("fixed", "", 100, policy)).toMatch(/2,50/);
    expect(validateManualDiscount("percentage", "5", 100, { ...policy, allow_percentage_discount: false })).toMatch(/no permite/);
    expect(calculateDiscountAmount(47.5, "fixed", "2,50")).toBe(2.5);
  });

  it("picks the discount like the API", () => {
    const base = { productDiscountAmount: 1.3, manualDiscountType: "fixed" as const, manualDiscountAmount: 2 };
    expect(resolveDiscount({ ...base, override: "auto" }).source).toBe("manual");
    expect(resolveDiscount({ ...base, override: "auto", manualDiscountAmount: 1 }).source).toBe("product");
    expect(resolveDiscount({ ...base, override: "auto", manualDiscountAmount: 1.3 }).source).toBe("manual");
    expect(resolveDiscount({ ...base, override: "product" }).amount).toBe(1.3);
    expect(resolveDiscount({ ...base, override: "none" }).amount).toBe(0);
  });

  it("writes the WhatsApp receipt", () => {
    const text = receiptText({
      storeName: "Tienda Local",
      when: "11:47 · venta b07038f2",
      items: [{ name: "Coca Cola 2l", quantity: 2, amount: 28 }],
      total: 28,
      paymentLabel: "Efectivo",
    });
    expect(text).toContain("Tienda Local");
    expect(text).toMatch(/2 × Coca Cola 2l — Bs 28,00/);
    expect(text).toMatch(/Total: Bs 28,00 · Efectivo/);
  });

  it("undo restores the previous sale", () => {
    const withProduct = posCartReducer(initialCartState, { type: "add", product });
    expect(posCartReducer(withProduct, { type: "restore", items: [] }).items).toEqual([]);
  });
});
