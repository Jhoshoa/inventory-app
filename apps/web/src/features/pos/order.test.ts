import { describe, expect, it } from "vitest";
import { resolveOrderItems, saveOrderForPos, takeOrderForPos, type PosOrder } from "./order";
import type { PosProduct } from "./types";

const product = (id: string, stock: number): PosProduct => ({
  id,
  name: `Producto ${id}`,
  price: "10.00",
  stock,
  unit: "unidad",
  qr_code: null,
  discount_type: null,
  discount_value: "0",
  effective_price: "10.00",
});

const order: PosOrder = {
  id: "o-1",
  customerName: "Ana",
  items: [
    { productId: "a", name: "A", quantity: 2 },
    { productId: "b", name: "B", quantity: 5 },
    { productId: "c", name: "C", quantity: 1 },
    { productId: null, name: "Viejo", quantity: 1 },
  ],
};

describe("Cobrar en Vender", () => {
  it("takes the order once and only for the same id", () => {
    saveOrderForPos(order);
    expect(takeOrderForPos("otro")).toBeNull();
    saveOrderForPos(order);
    expect(takeOrderForPos("o-1")).toEqual(order);
    expect(takeOrderForPos("o-1")).toBeNull();
  });

  it("adds what there is and explains the rest", () => {
    const products = new Map<string, PosProduct | null>([
      ["a", product("a", 10)],
      ["b", product("b", 3)],
      ["c", product("c", 0)],
    ]);
    const resolved = resolveOrderItems(order, products);
    expect(resolved.items.map((item) => [item.product.id, item.quantity])).toEqual([
      ["a", 2],
      ["b", 3],
    ]);
    expect(resolved.notes).toEqual([
      "Producto b: pidieron 5, solo hay 3.",
      "Producto c no tiene stock; no se agregó.",
      "Viejo ya no está en tu catálogo; no se agregó.",
    ]);
  });
});
