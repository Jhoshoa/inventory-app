import { describe, expect, it } from "vitest";
import {
  calculateCartTotal,
  initialCartState,
  posCartReducer,
  validateCheckout,
} from "./schemas";
import type { CartItem, PosProduct } from "./types";

const product: PosProduct = {
  id: "product-1",
  name: "Arroz 1kg",
  price: "12.50",
  stock: 2,
  unit: "unidad",
  qr_code: "QR-1",
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
      items: "Cantidad invalida para Arroz 1kg",
    });
  });

  it("validates payment methods", () => {
    expect(validateCheckout([{ product, quantity: 1 }], "crypto")).toEqual({
      payment_method: "Metodo de pago invalido",
    });
  });
});
