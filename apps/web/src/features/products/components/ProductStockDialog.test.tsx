import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductStockDialog } from "./ProductStockDialog";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [
      {
        ok: false,
        fieldErrors: { reason: "La razon es requerida para descontar stock" },
      },
      vi.fn(),
      false,
    ],
  };
});

describe("ProductStockDialog", () => {
  it("shows validation errors from stock action state", async () => {
    render(<ProductStockDialog productId="product-1" productName="Arroz" />);

    await userEvent.click(screen.getByRole("button", { name: "Ajustar stock" }));

    expect(
      screen.getByText("La razon es requerida para descontar stock"),
    ).toBeInTheDocument();
  });
});
