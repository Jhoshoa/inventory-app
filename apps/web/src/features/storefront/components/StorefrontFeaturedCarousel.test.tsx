import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PublicStorefrontProduct } from "../types";
import { StorefrontFeaturedCarousel } from "./StorefrontFeaturedCarousel";

const base: PublicStorefrontProduct = {
  id: "p-1",
  name: "Leche Pil 1l",
  price: "8.00",
  unit: "unidad",
  photo_url: null,
  available: true,
  low_stock: false,
  category: null,
  category_id: null,
  discount_type: null,
  discount_value: "0",
  effective_price: "8.00",
};

describe("StorefrontFeaturedCarousel", () => {
  it("shows the discount only on products that have one", () => {
    render(
      <StorefrontFeaturedCarousel
        slug="tienda"
        title="Destacados"
        products={[
          base,
          { ...base, id: "p-2", name: "Queso", price: "40.00", discount_type: "percentage", discount_value: "10", effective_price: "36.00" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Destacados" })).toBeInTheDocument();
    expect(screen.getAllByText(/^-\d+%$/)).toHaveLength(1);
    expect(screen.getByText("-10%")).toBeInTheDocument();
    expect(screen.queryByText("-0%")).not.toBeInTheDocument();
  });
});
