import { describe, expect, it } from "vitest";
import { discountSummary, filterSettingsGroups, teamSummary, timezoneText } from "./sections";
import { makeStore } from "./test/fixtures";

describe("settings sections", () => {
  it("has the three groups of the index", () => {
    expect(filterSettingsGroups("").map((group) => [group.title, group.sections.map((section) => section.label)])).toEqual([
      ["Tu negocio", ["Datos de la tienda", "Precios y descuentos"]],
      ["Ventas en línea", ["Catálogo público"]],
      ["Equipo y cuenta", ["Usuarios y permisos", "Plan y pagos", "Mi perfil"]],
    ]);
  });

  it("finds sections by their words, without accents", () => {
    expect(filterSettingsGroups("whatsapp").flatMap((group) => group.sections.map((section) => section.key))).toEqual(["catalogo"]);
    expect(filterSettingsGroups("contrasena").flatMap((group) => group.sections.map((section) => section.key))).toEqual(["perfil"]);
    expect(filterSettingsGroups("cajero").flatMap((group) => group.sections.map((section) => section.key))).toEqual(["precios", "usuarios"]);
    expect(filterSettingsGroups("zzz")).toEqual([]);
  });

  it("summarizes discounts and the team", () => {
    expect(discountSummary(makeStore())).toBe("Hasta 15% · cajeros con permiso");
    expect(discountSummary(makeStore({ allow_manual_discount: true, max_manual_discount_amount: "5.00", allow_cashier_discount_override: false }))).toBe(
      "Hasta 15% · hasta Bs 5",
    );
    expect(discountSummary(makeStore({ allow_percentage_discount: false }))).toBe("Sin descuentos al cobrar");
    expect(teamSummary(2, 1)).toBe("2 personas · 1 invitación pendiente");
    expect(teamSummary(1, 0)).toBe("1 persona");
    expect(timezoneText("America/La_Paz")).toBe("Bolivia (La Paz) · GMT−4");
  });
});
