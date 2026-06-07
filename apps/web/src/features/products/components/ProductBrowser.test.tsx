import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductBrowser } from "./ProductBrowser";
import type { ProductListResponse, ProductSearchParams } from "../types";

const emptyProducts: ProductListResponse = {
  items: [],
  limit: 50,
  offset: 0,
  total: 0,
};

const initialParams: ProductSearchParams = {
  direction: "asc",
  limit: 50,
  offset: 0,
  sort: "name",
  stock: "all",
};

describe("ProductBrowser", () => {
  it("renders a real create-product action for owners when inventory is empty", () => {
    render(
      <ProductBrowser
        initialParams={initialParams}
        initialProducts={emptyProducts}
        role="owner"
      />,
    );

    expect(screen.getByText("Todavia no hay productos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear producto" })).toHaveAttribute(
      "href",
      "/dashboard/products/new",
    );
    expect(screen.queryByRole("button", { name: "Crear producto" })).not.toBeInTheDocument();
  });

  it("does not show a create action to cashiers when inventory is empty", () => {
    render(
      <ProductBrowser
        initialParams={initialParams}
        initialProducts={emptyProducts}
        role="cashier"
      />,
    );

    expect(screen.getByText("La tienda todavia no tiene productos disponibles para vender.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Crear producto" })).not.toBeInTheDocument();
  });
});
