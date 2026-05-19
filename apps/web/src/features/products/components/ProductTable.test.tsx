import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductTable } from "./ProductTable";
import type { Product } from "../types";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: () => [{ ok: false, fieldErrors: {} }, vi.fn(), false] };
});

const product: Product = {
  id: "product-1",
  name: "Arroz 1kg",
  price: "12.50",
  stock: 3,
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
    render(<ProductTable products={[product]} />);

    expect(screen.getByText("Arroz 1kg")).toBeInTheDocument();
    expect(screen.getByText("A-001")).toBeInTheDocument();
    expect(screen.getByText("Bajo")).toBeInTheDocument();
  });

  it("renders an empty state", () => {
    render(<ProductTable products={[]} />);

    expect(screen.getByText("No hay productos para mostrar")).toBeInTheDocument();
  });
});
