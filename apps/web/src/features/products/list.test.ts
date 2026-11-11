import { describe, expect, it } from "vitest";
import {
  expiryLabel,
  hasActiveDiscount,
  productInitials,
  productListSearch,
  productMeta,
  sheetFilterCount,
  stockTag,
  thumbColor,
} from "./list";
import type { ProductSearchParams } from "./types";

const defaults: ProductSearchParams = { stock: "all", limit: 50, offset: 0, sort: "name", direction: "asc" };

describe("product list helpers", () => {
  it("labels stock like the board: units, few left or none", () => {
    expect(stockTag({ stock: 40, min_stock: 5, unit: "unidad" })).toEqual({ label: "40 u.", tone: "ok" });
    expect(stockTag({ stock: 3, min_stock: 5, unit: "kg" })).toEqual({ label: "Quedan 3", tone: "warn" });
    expect(stockTag({ stock: 0, min_stock: 5, unit: "unidad" })).toEqual({ label: "Sin stock", tone: "bad" });
    expect(stockTag({ stock: 12, min_stock: 2, unit: "kg" }).label).toBe("12 kg");
  });

  it("builds initials and a stable thumbnail color", () => {
    expect(productInitials("Aceite Fino 1l")).toBe("AF");
    expect(productInitials("  yogur  ")).toBe("Y");
    expect(productInitials("¡Ñandú 2!")).toBe("Ñ2");
    expect(thumbColor("Leche Pil")).toEqual(thumbColor("Leche Pil"));
  });

  it("shows the struck price only with an active discount", () => {
    expect(hasActiveDiscount({ price: "4.00", effective_price: "3.20" })).toBe(true);
    expect(hasActiveDiscount({ price: "4.00", effective_price: "4.00" })).toBe(false);
  });

  it("puts the SKU and category in the meta line", () => {
    expect(productMeta({ sku: "LAC000001", category: "Lácteos" })).toBe("LAC000001 · Lácteos");
    expect(productMeta({ sku: null, category: null })).toBe("Sin categoría");
  });

  it("says how many days are left before the next batch expires", () => {
    expect(expiryLabel(null, "2026-11-10")).toBeNull();
    expect(expiryLabel("2026-11-13", null)).toEqual({ label: "13/11", urgent: false });
    expect(expiryLabel("2026-11-13", "2026-11-10")).toEqual({ label: "13/11 · 3 días", urgent: true });
    expect(expiryLabel("2026-11-11", "2026-11-10")).toEqual({ label: "11/11 · 1 día", urgent: true });
    expect(expiryLabel("2026-11-10", "2026-11-10")).toEqual({ label: "10/11 · hoy", urgent: true });
    expect(expiryLabel("2026-11-09", "2026-11-10")).toEqual({ label: "Vencido 09/11", urgent: true });
    expect(expiryLabel("2026-12-01", "2026-11-10")).toEqual({ label: "01/12", urgent: false });
  });

  it("keeps only non-default filters in the URL", () => {
    expect(productListSearch(defaults)).toBe("");
    expect(
      productListSearch({ ...defaults, q: "leche", stock: "low", category_id: "c-1", sort: "price", direction: "desc", offset: 50 }),
    ).toBe("?q=leche&category_id=c-1&stock=low&sort=price&direction=desc&offset=50");
  });

  it("counts what the phone keeps inside Filtros", () => {
    expect(sheetFilterCount(defaults)).toBe(0);
    expect(sheetFilterCount({ ...defaults, stock: "low" })).toBe(0);
    expect(sheetFilterCount({ ...defaults, stock: "out", category_id: "c-1", sort: "stock" })).toBe(3);
  });
});
