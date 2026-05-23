import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductFilters } from "./ProductFilters";
import type { ProductSearchParams } from "../types";

const params: ProductSearchParams = {
  stock: "all",
  limit: 50,
  offset: 0,
  sort: "name",
  direction: "asc",
};

describe("ProductFilters", () => {
  it("renders category filter and emits category_id changes", () => {
    const onFilterChange = vi.fn();

    render(
      <ProductFilters
        params={params}
        query=""
        categories={[
          {
            id: "category-1",
            name: "Comida",
            sku_prefix: "COM",
            next_sku_number: 3,
            is_active: true,
          },
        ]}
        onQueryChange={vi.fn()}
        onFilterChange={onFilterChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Filtro de categoria"), {
      target: { value: "category-1" },
    });

    expect(onFilterChange).toHaveBeenCalledWith({
      category_id: "category-1",
      category: undefined,
    });
  });
});
