import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductTable } from "./ProductTable";
import type { Product } from "../types";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push }),
}));

vi.mock("../qr", () => ({
  generateQrSvg: vi.fn(async () => "<svg></svg>"),
  svgToDataUri: () => "data:image/svg+xml,",
  toQrFilename: () => "qr.svg",
}));

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    name: "Leche Pil 1l",
    price: "7.50",
    stock: 2,
    category_id: null,
    category: "Lácteos",
    qr_code: "7751234",
    photo_url: null,
    min_stock: 5,
    unit: "unidad",
    sku: "LAC000001",
    cost_price: null,
    is_active: true,
    version: 1,
    discount_type: null,
    discount_value: "0",
    discount_ends_at: null,
    effective_price: "7.50",
    locations: [{ id: "l-1", label: "Heladera", zone: "Heladera", shelf: null, level: null, kind: "display" }],
    next_expiry: "2026-11-13",
    ...overrides,
  };
}

describe("ProductTable", () => {
  beforeEach(() => push.mockReset());

  it("shows the board columns: where it is, stock, expiry and price", () => {
    render(<ProductTable products={[product()]} role="owner" today="2026-11-10" />);
    const table = screen.getByRole("table");

    for (const header of ["Producto", "Dónde está", "Stock", "Vence", "Precio"]) {
      expect(within(table).getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(within(table).getByRole("link", { name: "Leche Pil 1l" })).toHaveAttribute("href", "/dashboard/products/product-1");
    expect(within(table).getByText("LAC000001 · Lácteos")).toBeInTheDocument();
    expect(within(table).getAllByText("Heladera").length).toBeGreaterThan(0);
    expect(within(table).getByText("Quedan 2")).toBeInTheDocument();
    expect(within(table).getByText("13/11 · 3 días")).toBeInTheDocument();
    expect(within(table).getByText(/Bs\s?7,50/)).toBeInTheDocument();
  });

  it("strikes the old price when a discount is active", () => {
    render(<ProductTable products={[product({ price: "4.00", effective_price: "3.20" })]} role="owner" />);
    const table = screen.getByRole("table");
    expect(within(table).getByText(/Bs\s?3,20/)).toBeInTheDocument();
    expect(within(table).getByText(/Bs\s?4,00/)).toHaveClass("line-through");
  });

  it("phone cards open the detail", () => {
    render(<ProductTable products={[product({ stock: 0 })]} role="cashier" today="2026-11-10" />);
    const cards = screen.getByRole("list", { name: "Productos" });
    const card = within(cards).getByRole("link");
    expect(card).toHaveAttribute("href", "/dashboard/products/product-1");
    expect(within(card).getByText("Sin stock")).toBeInTheDocument();
    expect(within(card).getByText("Lácteos · vence 13/11 · 3 días")).toBeInTheDocument();
  });

  it("the owner adjusts stock and opens the ⋯ menu", () => {
    render(<ProductTable products={[product()]} role="owner" />);

    expect(screen.getByRole("button", { name: "Ajustar stock" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Más acciones de Leche Pil 1l" }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Ver detalle",
      "Editar",
      "Dónde está",
      "Ver código QR",
      "Eliminar…",
    ]);
    expect(within(menu).getByRole("menuitem", { name: "Editar" })).toHaveAttribute("href", "/dashboard/products/product-1/edit");
    expect(within(menu).getByRole("menuitem", { name: "Dónde está" })).toHaveAttribute(
      "href",
      "/dashboard/products/product-1#donde-esta",
    );
  });

  it("Eliminar asks to type ELIMINAR", () => {
    render(<ProductTable products={[product()]} role="owner" />);
    fireEvent.click(screen.getByRole("button", { name: "Más acciones de Leche Pil 1l" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar…" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Escribe ELIMINAR/)).toBeInTheDocument();
  });

  it("hides Ver código QR when the product has no code", () => {
    render(<ProductTable products={[product({ qr_code: null })]} role="owner" />);
    fireEvent.click(screen.getByRole("button", { name: "Más acciones de Leche Pil 1l" }));
    expect(screen.queryByRole("menuitem", { name: "Ver código QR" })).not.toBeInTheDocument();
  });

  it("the cashier only sees the list, without actions", () => {
    render(<ProductTable products={[product()]} role="cashier" />);
    expect(screen.queryByRole("button", { name: "Ajustar stock" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Más acciones/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Acciones" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Heladera").length).toBeGreaterThan(0);
  });

  it("clicking a row opens the detail, but not when clicking its buttons", () => {
    render(<ProductTable products={[product()]} role="owner" />);
    const row = screen.getByRole("table").querySelector("tbody tr")!;
    fireEvent.click(within(row as HTMLElement).getByText("Quedan 2"));
    expect(push).toHaveBeenCalledWith("/dashboard/products/product-1");
    push.mockReset();
    fireEvent.click(screen.getByRole("button", { name: "Más acciones de Leche Pil 1l" }));
    expect(push).not.toHaveBeenCalled();
  });
});
