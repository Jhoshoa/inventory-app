import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PosProductResults } from "./PosProductResults";
import type { PosProduct } from "../types";

const availableProduct: PosProduct = {
  id: "product-1",
  name: "Arroz 1kg",
  price: "12.50",
  stock: 3,
  unit: "unidad",
  qr_code: "QR-1",
};

const outOfStockProduct: PosProduct = {
  ...availableProduct,
  id: "product-2",
  name: "Azucar",
  stock: 0,
};

describe("PosProductResults", () => {
  it("adds only products with stock", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(
      <PosProductResults
        products={[availableProduct, outOfStockProduct]}
        onAdd={onAdd}
      />,
    );

    const buttons = screen.getAllByRole("button", { name: "Agregar" });
    await user.click(buttons[0]);

    expect(onAdd).toHaveBeenCalledWith(availableProduct);
    expect(buttons[0]).toBeEnabled();
    expect(buttons[1]).toBeDisabled();
    expect(screen.getByText("Sin stock")).toBeInTheDocument();
  });

  it("renders an empty state", () => {
    render(<PosProductResults products={[]} onAdd={vi.fn()} />);

    expect(screen.getByText("Sin productos para esta busqueda")).toBeInTheDocument();
  });
});
