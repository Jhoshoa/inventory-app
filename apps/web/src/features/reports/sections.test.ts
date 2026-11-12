import { describe, expect, it } from "vitest";
import { canViewSection, sectionHref, visibleSections } from "./sections";

describe("report sections", () => {
  it("shows the cashier only Ventas and Movimientos de stock", () => {
    expect(visibleSections("cashier").map((section) => section.key)).toEqual(["ventas", "stock"]);
    expect(visibleSections("owner").map((section) => section.key)).toEqual(["ventas", "cierres", "caja", "stock", "descargas"]);
    expect(canViewSection("descargas", "cashier")).toBe(false);
  });

  it("keeps the range across tabs", () => {
    expect(sectionHref("cierres", { range: "7d", from: "2026-11-04", to: "2026-11-10" })).toBe(
      "/dashboard/reports/store-days?range=7d&from=2026-11-04&to=2026-11-10",
    );
  });
});
