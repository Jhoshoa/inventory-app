import { describe, expect, it } from "vitest";
import {
  activeMobileTab,
  moreNavItems,
  moreParentFor,
  shouldShowMobileTabBar,
  usesNarrowSidebar,
  visibleNavItems,
} from "./navigation";

describe("navigation", () => {
  it("owner and cashier see the same items except Configuración", () => {
    expect(visibleNavItems("owner").map((item) => item.label)).toEqual([
      "Inicio",
      "Vender",
      "Caja",
      "Productos",
      "Ventas",
      "Pedidos",
      "Reportes",
      "Configuración",
    ]);
    expect(visibleNavItems("cashier").map((item) => item.label)).not.toContain("Configuración");
    expect(moreNavItems("owner").map((item) => item.label)).toEqual(["Caja", "Pedidos", "Reportes", "Configuración"]);
    expect(moreNavItems("cashier").map((item) => item.label)).toEqual(["Caja", "Pedidos", "Reportes"]);
  });

  it.each([
    ["/dashboard", "inicio"],
    ["/dashboard/products", "productos"],
    ["/dashboard/products/abc/edit", "productos"],
    ["/dashboard/pos", "vender"],
    ["/dashboard/sales", "ventas"],
    ["/dashboard/sales/abc", "ventas"],
    ["/dashboard/mas", "mas"],
    ["/dashboard/caja", "mas"],
    ["/dashboard/solicitudes", "mas"],
    ["/dashboard/reports/store-days", "mas"],
    ["/dashboard/settings/catalogo", "mas"],
  ])("%s marks %s in the bottom bar", (pathname, tab) => {
    expect(activeMobileTab(pathname)).toBe(tab);
  });

  it("pages opened from Más show the way back to Más", () => {
    expect(moreParentFor("/dashboard/solicitudes")).toEqual({ href: "/dashboard/mas", label: "Más" });
    expect(moreParentFor("/dashboard/mas")).toBeNull();
    expect(moreParentFor("/dashboard/products")).toBeNull();
  });

  it("hides the bottom bar only where the page has its own fixed bar", () => {
    expect(shouldShowMobileTabBar("/dashboard/sales/abc/print")).toBe(false);
    expect(shouldShowMobileTabBar("/dashboard/sales/abc")).toBe(true);
    expect(shouldShowMobileTabBar("/dashboard/products/new")).toBe(false);
    expect(shouldShowMobileTabBar("/dashboard/products/p-1/edit")).toBe(false);
    expect(shouldShowMobileTabBar("/dashboard/products/p-1")).toBe(true);
    expect(shouldShowMobileTabBar("/dashboard/products/categorias")).toBe(true);
    expect(shouldShowMobileTabBar("/dashboard")).toBe(true);
  });

  it("uses the narrow sidebar in Vender", () => {
    expect(usesNarrowSidebar("/dashboard/pos")).toBe(true);
    expect(usesNarrowSidebar("/dashboard/products")).toBe(false);
  });
});
