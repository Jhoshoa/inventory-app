import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductDetail } from "./ProductDetail";
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

describe("ProductDetail", () => {
  it("shows administrative actions for owner", () => {
    render(<ProductDetail product={product} role="owner" />);

    expect(screen.getByRole("link", { name: "Editar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajustar stock" })).toBeInTheDocument();
  });

  it("hides administrative actions for cashier", () => {
    render(<ProductDetail product={product} role="cashier" />);

    expect(screen.queryByRole("link", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajustar stock" })).not.toBeInTheDocument();
  });
});
