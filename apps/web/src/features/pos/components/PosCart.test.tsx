import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
        onQuantityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Arroz 1kg")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Cantidad" })).toHaveValue("2");
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("+")).toBeInTheDocument();
    expect(screen.getAllByText(/Bs\s+25,00/)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Disminuir cantidad" })).toHaveClass("text-text-strong");
    expect(screen.getByRole("button", { name: "Aumentar cantidad" })).toHaveClass("text-text-strong");
  });

  it("renders an empty state", () => {
    render(
      <PosCart
        items={[]}
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
        onQuantityChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Agrega productos para iniciar una venta.")).toBeInTheDocument();
  });

  it("allows typing a valid quantity directly", async () => {
    const user = userEvent.setup();
    const onQuantityChange = vi.fn();

    render(
      <PosCart
        items={items}
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
        onQuantityChange={onQuantityChange}
        onRemove={vi.fn()}
      />,
    );

    const quantityInput = screen.getByRole("textbox", { name: "Cantidad" });
    await user.clear(quantityInput);
    await user.type(quantityInput, "5");

    expect(onQuantityChange).toHaveBeenLastCalledWith("product-1", 5);
  });

  it("ignores zero-only typed quantities", async () => {
    const user = userEvent.setup();
    const onQuantityChange = vi.fn();

    render(
      <PosCart
        items={items}
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
        onQuantityChange={onQuantityChange}
        onRemove={vi.fn()}
      />,
    );

    const quantityInput = screen.getByRole("textbox", { name: "Cantidad" });
    await user.clear(quantityInput);
    await user.type(quantityInput, "000");

    expect(onQuantityChange).not.toHaveBeenCalled();
  });

  it("marks stale cart quantities after stock refresh and offers explicit adjustment", async () => {
    const user = userEvent.setup();
    const onQuantityChange = vi.fn();

    render(
      <PosCart
        items={[
          {
            ...items[0],
            product: { ...items[0].product, stock: 1 },
            quantity: 2,
          },
        ]}
        onIncrement={vi.fn()}
        onDecrement={vi.fn()}
        onQuantityChange={onQuantityChange}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText(/Stock actualizado: disponible 1, cantidad en carrito 2./)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ajustar a 1" }));

    expect(onQuantityChange).toHaveBeenCalledWith("product-1", 1);
  });
});
