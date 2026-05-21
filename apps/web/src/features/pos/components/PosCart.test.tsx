import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PosCart } from "./PosCart";
import type { CartItem } from "../types";

const items: CartItem[] = [
  {
    product: {
      id: "product-1",
      name: "Arroz 1kg",
      price: "12.50",
      stock: 5,
      unit: "unidad",
      qr_code: null,
    },
    quantity: 2,
  },
];

describe("PosCart", () => {
  it("renders selected items and total", () => {
    render(
      <PosCart
        items={items}
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Arroz 1kg")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("+")).toBeInTheDocument();
    expect(screen.getAllByText(/Bs\s+25,00/)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Disminuir cantidad" })).toHaveClass("text-slate-950");
    expect(screen.getByRole("button", { name: "Aumentar cantidad" })).toHaveClass("text-slate-950");
  });

  it("renders an empty state", () => {
    render(
      <PosCart
        items={[]}
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Agrega productos para iniciar una venta.")).toBeInTheDocument();
  });
});
