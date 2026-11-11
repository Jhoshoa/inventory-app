import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductFilters } from "./ProductFilters";
import type { ProductSearchParams } from "../types";

const params: ProductSearchParams = { stock: "all", limit: 50, offset: 0, sort: "name", direction: "asc" };
const categories = [{ id: "category-1", name: "Lácteos", sku_prefix: "LAC", next_sku_number: 3, is_active: true }];
const counts = { total: 19, low: 5, out: 1, expiring: 3 };

function setup(overrides: Partial<Parameters<typeof ProductFilters>[0]> = {}) {
  const props = {
    params,
    query: "",
    categories,
    counts,
    total: 19,
    onQueryChange: vi.fn(),
    onSearchSubmit: vi.fn(),
    onScan: vi.fn(),
    onFilterChange: vi.fn(),
    ...overrides,
  };
  render(<ProductFilters {...props} />);
  return props;
}

describe("ProductFilters", () => {
  it("stock chips show counts and the chosen one is pressed", () => {
    const props = setup({ params: { ...params, stock: "low" } });
    const chips = screen.getByRole("group", { name: "Stock" });

    expect(within(chips).getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "false");
    expect(within(chips).getByRole("button", { name: "Stock bajo · 5" })).toHaveAttribute("aria-pressed", "true");
    expect(within(chips).getByRole("button", { name: "Sin stock · 1" })).toBeInTheDocument();
    fireEvent.click(within(chips).getByRole("button", { name: "Por vencer · 3" }));
    expect(props.onFilterChange).toHaveBeenCalledWith({ stock: "expiring" });
  });

  it("chips without counts when they are not known", () => {
    setup({ counts: null });
    expect(screen.getByRole("button", { name: "Stock bajo" })).toBeInTheDocument();
  });

  it("category and sort change the filters", () => {
    const props = setup();
    fireEvent.change(screen.getByRole("combobox", { name: "Categoría" }), { target: { value: "category-1" } });
    expect(props.onFilterChange).toHaveBeenCalledWith({ category_id: "category-1", category: undefined });
    fireEvent.change(screen.getByRole("combobox", { name: "Ordenar por" }), { target: { value: "price:desc" } });
    expect(props.onFilterChange).toHaveBeenCalledWith({ sort: "price", direction: "desc" });
  });

  it("asks for 3 letters and submits with Enter", () => {
    const props = setup({ query: "co" });
    expect(screen.getByRole("status")).toHaveTextContent("Escribe al menos 3 letras");
    fireEvent.submit(screen.getByRole("search"));
    expect(props.onSearchSubmit).toHaveBeenCalled();
  });

  it("shows the code message instead of the hint", () => {
    setup({ query: "7751", searchMessage: "Ese código no es de ningún producto." });
    expect(screen.getByRole("status")).toHaveTextContent("Ese código no es de ningún producto.");
  });

  it("the phone scan button calls the camera", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Escanear código" }));
    expect(props.onScan).toHaveBeenCalled();
  });

  it("the phone filter sheet has stock, category and sort, and clears them", () => {
    const props = setup({ params: { ...params, stock: "out", category_id: "category-1" }, total: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Filtros · 2" }));
    const sheet = screen.getByRole("dialog", { name: "Filtrar productos" });

    expect(within(sheet).getByRole("button", { name: "Sin stock · 1" })).toHaveAttribute("aria-pressed", "true");
    expect(within(sheet).getByLabelText("Categoría")).toHaveValue("category-1");
    fireEvent.change(within(sheet).getByLabelText("Ordenar por"), { target: { value: "updated_at" } });
    expect(props.onFilterChange).toHaveBeenCalledWith({ sort: "updated_at", direction: "desc" });
    expect(within(sheet).getByLabelText("Orden")).toHaveTextContent("A → Z");

    fireEvent.click(within(sheet).getByRole("button", { name: "Limpiar" }));
    expect(props.onFilterChange).toHaveBeenCalledWith({
      stock: "all",
      category_id: undefined,
      category: undefined,
      sort: "name",
      direction: "asc",
    });
    fireEvent.click(within(sheet).getByRole("button", { name: "Ver 1 producto" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
