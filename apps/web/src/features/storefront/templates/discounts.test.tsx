import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StorefrontBoletaProvider, useBoleta } from "../boleta";
import type { PublicStorefrontProduct } from "../types";
import { CardBoletaButton } from "./BoletaControls";
import { discountPercent, offerUntilLabel } from "./shared";
import { VitrinaCard } from "./Vitrina";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/t/tienda",
  useSearchParams: () => new URLSearchParams(),
}));

const base: PublicStorefrontProduct = {
  id: "p-coca",
  name: "Coca Cola 2l",
  price: "14.00",
  unit: "unidad",
  photo_url: null,
  available: true,
  low_stock: false,
  category: "Bebidas",
  category_id: "c-1",
  discount_type: null,
  discount_value: "0",
  effective_price: "14.00",
};
const percentage = { ...base, discount_type: "percentage" as const, discount_value: "25.00", effective_price: "10.50" };
const fixed = { ...base, name: "Papas", price: "9.00", discount_type: "fixed" as const, discount_value: "1.50", effective_price: "7.50" };

describe("discountPercent", () => {
  it("uses the percentage, or computes it for fixed-amount discounts", () => {
    expect(discountPercent(percentage)).toBe(25);
    expect(discountPercent(fixed)).toBe(17);
  });

  it("is null without a discount or when the backend says it expired", () => {
    expect(discountPercent(base)).toBeNull();
    // Vencido: el backend manda discount_type null y el precio de lista.
    expect(discountPercent({ ...base, discount_type: null, discount_value: "0" })).toBeNull();
  });
});

describe("offerUntilLabel", () => {
  it("shows the end date in the store's timezone", () => {
    // 2026-11-14 02:00 UTC es el viernes 13 en La Paz (UTC-4).
    expect(offerUntilLabel("2026-11-14T02:00:00Z", "America/La_Paz")).toMatch(/^Oferta hasta el vie\.? 13\/11$/);
    expect(offerUntilLabel(null, "America/La_Paz")).toBeNull();
  });
});

describe("VitrinaCard with a discount", () => {
  it("shows the -% tag, the sticker with the new price and the old price", () => {
    render(
      <StorefrontBoletaProvider slug="tienda">
        <VitrinaCard slug="tienda" product={percentage} />
      </StorefrontBoletaProvider>,
    );

    expect(screen.getByText("-25%")).toBeInTheDocument();
    expect(screen.getByText("10,50")).toBeInTheDocument();
    expect(screen.getByText(/14,00/).closest("p")).toHaveTextContent("Antes");
    expect(screen.queryByText("Bebidas")).not.toBeInTheDocument();
  });

  it("shows the category and no tag without a discount", () => {
    render(
      <StorefrontBoletaProvider slug="tienda">
        <VitrinaCard slug="tienda" product={base} />
      </StorefrontBoletaProvider>,
    );

    expect(screen.queryByText(/^-\d+%$/)).not.toBeInTheDocument();
    expect(screen.getByText("Bebidas")).toBeInTheDocument();
    expect(screen.queryByText("Antes")).not.toBeInTheDocument();
  });
});

function BoletaPrices() {
  const { lines } = useBoleta();
  return (
    <ul aria-label="boleta">
      {lines.map((line) => (
        <li key={line.productId}>{`${line.name} ${line.unitPrice}`}</li>
      ))}
    </ul>
  );
}

describe("Boleta prices", () => {
  it("takes the current price when a product in the boleta started a discount", () => {
    window.localStorage.setItem(
      "tiendamiga:boleta:tienda",
      JSON.stringify([{ productId: "p-coca", name: "Coca Cola 2l", unit: "unidad", unitPrice: "14.00", photoUrl: null, quantity: 2 }]),
    );

    render(
      <StorefrontBoletaProvider slug="tienda">
        <CardBoletaButton product={percentage} />
        <BoletaPrices />
      </StorefrontBoletaProvider>,
    );

    expect(within(screen.getByRole("list", { name: "boleta" })).getByText("Coca Cola 2l 10.50")).toBeInTheDocument();
  });
});
