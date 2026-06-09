import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductTable } from "./ProductTable";
import type { Product } from "../types";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: () => [{ ok: false, fieldErrors: {} }, vi.fn(), false] };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
}));

const product: Product = {
  id: "product-1",
  name: "Arroz 1kg",
  price: "12.50",
  stock: 3,
  category_id: null,
  category: "Abarrotes",
  qr_code: "QR-1",
  photo_url: null,
  min_stock: 5,
  unit: "unidad",
  sku: "A-001",
  cost_price: null,
  is_active: true,
  version: 1,
};

describe("ProductTable", () => {
  it("renders rows and stock badges", () => {
    render(<ProductTable products={[product]} role="owner" />);

    expect(screen.getByText("Arroz 1kg")).toBeInTheDocument();
    expect(screen.getByText("A-001")).toBeInTheDocument();
    expect(screen.getByText("Bajo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajustar stock" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("renders mobile card labels without removing row actions", () => {
    render(<ProductTable products={[product]} role="owner" />);

    expect(screen.getAllByText("Producto").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Codigo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stock").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Ver" })).toHaveAttribute(
      "href",
      "/dashboard/products/product-1",
    );
  });

  it("renders an empty state", () => {
    render(<ProductTable products={[]} role="owner" />);

    expect(screen.getByText("No hay productos para mostrar")).toBeInTheDocument();
  });

  it("hides administrative actions for cashier", () => {
    render(<ProductTable products={[product]} role="cashier" />);

    expect(screen.getByRole("link", { name: "Ver" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajustar stock" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  });
});
