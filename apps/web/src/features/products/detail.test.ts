import { describe, expect, it } from "vitest";
import { daysLeftText, discountSummary, liveBatches, movementLabel, movementWhen, profitLine, stockState } from "./detail";
import type { ProductBatch } from "./types";

const base = {
  price: "6.50",
  effective_price: "5.85",
  cost_price: "4.20",
  discount_type: "percentage" as const,
  discount_value: "10.00",
  discount_ends_at: "2026-11-14T23:59:59.999Z",
};

describe("product detail helpers", () => {
  it("summarizes a live discount", () => {
    const now = Date.parse("2026-11-12T12:00:00Z");
    expect(discountSummary(base, now)).toBe("−10% hasta 14/11");
    expect(discountSummary({ ...base, discount_ends_at: null }, now)).toBe("−10%");
    expect(discountSummary({ ...base, discount_type: "fixed", discount_value: "0.80", discount_ends_at: null }, now)).toMatch(/−Bs\s?0,80/);
    expect(discountSummary({ ...base, discount_ends_at: "2026-11-01T23:59:59Z" }, now)).toBeNull();
    expect(discountSummary({ ...base, discount_type: null }, now)).toBeNull();
  });

  it("shows the profit with the discount when there is one", () => {
    expect(profitLine({ ...base, discount_ends_at: null })).toMatch(/^Ganas Bs\s?1,65 con descuento$/);
    expect(profitLine({ ...base, discount_type: null })).toMatch(/^Ganas Bs\s?2,30 por unidad$/);
    expect(profitLine({ ...base, discount_type: null, cost_price: "7" })).toMatch(/^Pierdes Bs\s?0,50/);
    expect(profitLine({ ...base, cost_price: null })).toBeNull();
  });

  it("names the stock state", () => {
    expect(stockState({ stock: 0, min_stock: 2 })).toEqual({ label: "Sin stock", tone: "danger" });
    expect(stockState({ stock: 2, min_stock: 2 }).label).toBe("Bajo");
    expect(stockState({ stock: 11, min_stock: 4 }).label).toBe("Disponible");
  });

  it("lists only lots with units, soonest first", () => {
    const lot = (id: string, expires_on: string, quantity_remaining: number) =>
      ({ id, expires_on, quantity_remaining }) as ProductBatch;
    expect(liveBatches([lot("a", "2026-12-20", 3), lot("b", "2026-11-13", 8), lot("c", "2026-11-01", 0)]).map((b) => b.id)).toEqual(["b", "a"]);
  });

  it("explains days left and movements", () => {
    expect(daysLeftText(3)).toBe("en 3 días");
    expect(daysLeftText(1)).toBe("mañana");
    expect(daysLeftText(0)).toBe("vence hoy");
    expect(daysLeftText(-2)).toBe("venció hace 2 días");
    expect(movementLabel({ movement_type: "manual_adjustment", reason: "Envase roto", sale_id: null })).toBe("Ajuste: Envase roto");
    expect(movementLabel({ movement_type: "sale_void", reason: null, sale_id: "s" })).toBe("Anulación de venta");
    expect(movementLabel({ movement_type: "other", reason: null, sale_id: null })).toBe("Movimiento");
  });

  it("says Hoy / Ayer / date for movements", () => {
    const now = new Date(2026, 10, 12, 15, 0);
    expect(movementWhen(new Date(2026, 10, 12, 1, 4).toISOString(), now)).toBe("Hoy 01:04");
    expect(movementWhen(new Date(2026, 10, 11, 18, 20).toISOString(), now)).toBe("Ayer 18:20");
    expect(movementWhen(new Date(2026, 10, 9, 14, 3).toISOString(), now)).toBe("09/11 14:03");
  });
});
