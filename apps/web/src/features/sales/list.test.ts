import { describe, expect, it } from "vitest";
import {
  activePreset,
  businessDateKey,
  dayHeading,
  exportHref,
  groupSalesByDay,
  itemsSummary,
  presetRange,
  rangeLabel,
  saleReceiptText,
  saleSourceLabel,
  saleWhen,
  shiftDate,
  toSalesSummary,
  validateRange,
} from "./list";
import { makeSale } from "./test/fixtures";

describe("sales list helpers", () => {
  it("uses the Bolivia day, not the UTC one", () => {
    // 02:30 UTC del 11 es todavía el 10 en La Paz (UTC-4).
    expect(businessDateKey("2026-11-11T02:30:00Z")).toBe("2026-11-10");
    expect(shiftDate("2026-11-01", -1)).toBe("2026-10-31");
  });

  it("builds quick ranges clamped to the store's first day", () => {
    expect(presetRange("today", "2026-11-12", null)).toEqual({ from_date: "2026-11-12", to_date: "2026-11-12" });
    expect(presetRange("yesterday", "2026-11-12", null)).toEqual({ from_date: "2026-11-11", to_date: "2026-11-11" });
    expect(presetRange("week", "2026-11-12", null)).toEqual({ from_date: "2026-11-06", to_date: "2026-11-12" });
    // Tienda abierta hace 3 días: "7 días" empieza el primer día y "Ayer" no existe el primer día.
    expect(presetRange("week", "2026-11-12", "2026-11-10")).toEqual({ from_date: "2026-11-10", to_date: "2026-11-12" });
    expect(presetRange("yesterday", "2026-11-12", "2026-11-12")).toBeNull();
  });

  it("knows which chip a range belongs to", () => {
    expect(activePreset("2026-11-12", "2026-11-12", "2026-11-12", null)).toBe("today");
    expect(activePreset("2026-11-10", "2026-11-12", "2026-11-12", "2026-11-10")).toBe("week");
    expect(activePreset("2026-11-01", "2026-11-05", "2026-11-12", null)).toBe("custom");
    expect(rangeLabel("2026-11-01", "2026-11-05", "2026-11-12", null)).toBe("01/11 – 05/11");
    expect(rangeLabel("2026-11-05", "2026-11-05", "2026-11-12", null)).toBe("05/11/2026");
    expect(rangeLabel("2026-11-11", "2026-11-11", "2026-11-12", null)).toBe("Ayer");
  });

  it("validates chosen dates", () => {
    expect(validateRange("2026-11-12", "2026-11-10", null)).toBe("\"Desde\" no puede ser posterior a \"Hasta\".");
    expect(validateRange("2026-11-01", "2026-11-10", "2026-11-05")).toBe(
      "La tienda empezó a vender el 05/11/2026; elige desde esa fecha.",
    );
    expect(validateRange("2026-01-01", "2026-11-10", null)).toBe("Elige un rango de hasta 90 días.");
    expect(validateRange("", "2026-11-10", null)).toBe("Elige las dos fechas.");
    expect(validateRange("2026-11-01", "2026-11-10", "2026-11-01")).toBeNull();
  });

  it("groups by day and leaves voided sales out of the day total", () => {
    const groups = groupSalesByDay([
      makeSale({ id: "a", total: "10.00" }),
      makeSale({ id: "b", total: "5.00", status: "voided" }),
      makeSale({ id: "c", total: "7.50", created_at: "2026-11-10T02:00:00Z" }),
    ]);
    expect(groups.map((group) => [group.date, group.total, group.sales.length])).toEqual([
      ["2026-11-10", 10, 2],
      ["2026-11-09", 7.5, 1],
    ]);
    expect(dayHeading("2026-11-10")).toBe("Martes 10/11");
  });

  it("summarizes products, time and source", () => {
    expect(itemsSummary(makeSale())).toBe("Coca Cola 2l × 2, Papas Fritas 120g +1 más");
    expect(itemsSummary(makeSale({ items: [] }))).toBe("Sin productos");
    expect(saleWhen("2026-11-10T15:47:00Z", "2026-11-10")).toBe("Hoy 11:47");
    expect(saleWhen("2026-11-10T15:47:00Z", "2026-11-11")).toBe("Ayer 11:47");
    expect(saleWhen("2026-11-10T15:47:00Z", "2026-11-20")).toBe("10/11/2026 11:47");
    expect(saleSourceLabel("web-pos")).toBe("En línea");
    expect(saleSourceLabel(null)).toBe("En línea");
    expect(saleSourceLabel("device-abc")).toBe("Sin conexión, enviada después");
  });

  it("writes the WhatsApp receipt with the discount", () => {
    const text = saleReceiptText(makeSale(), "Tienda Local", "2026-11-10");
    expect(text).toContain("Hoy 11:47 · venta b07038f2");
    expect(text).toContain("2 × Coca Cola 2l — Bs 28,00");
    expect(text).toContain("Descuento: − Bs 1,30");
    expect(text).toContain("Total: Bs 46,20 · Efectivo");
  });

  it("builds the export link and the summary", () => {
    expect(exportHref({ from_date: "2026-11-01", to_date: "2026-11-10" })).toBe(
      "/api/exports/sales?from_date=2026-11-01&to_date=2026-11-10",
    );
    expect(
      toSalesSummary(
        {
          from_date: "2026-11-10",
          to_date: "2026-11-10",
          first_business_date: null,
          total_sales: "1060.50",
          sales_count: 37,
          items_count: 80,
          by_payment_method: [
            { payment_method: "qr", total: "318.50", count: 10 },
            { payment_method: "efectivo", total: "742.00", count: 27 },
            { payment_method: "tarjeta", total: "0.00", count: 0 },
          ],
          top_products: [],
        },
        1,
      ),
    ).toEqual({
      count: 37,
      total: 1060.5,
      byMethod: [
        { method: "efectivo", total: 742 },
        { method: "qr", total: 318.5 },
      ],
      voided: 1,
    });
    expect(toSalesSummary(null, 2)).toBeNull();
  });
});
