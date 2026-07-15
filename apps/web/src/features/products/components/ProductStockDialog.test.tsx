import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { adjustStockAction } from "../actions";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductStockDialog } from "./ProductStockDialog";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("../actions", () => ({
  adjustStockAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

describe("ProductStockDialog", () => {
  beforeEach(() => {
    vi.mocked(adjustStockAction).mockReset();
    mocks.refresh.mockClear();
  });

  it("shows validation errors from stock action state", async () => {
    vi.mocked(adjustStockAction).mockResolvedValue({
      ok: false,
      fieldErrors: { reason: "La razon es requerida para descontar stock" },
    });
    const user = userEvent.setup();

    render(<ProductStockDialog productId="product-1" productName="Arroz" />);

    await user.click(screen.getByRole("button", { name: "Ajustar stock" }));
    await user.click(screen.getByRole("button", { name: "Guardar ajuste" }));

    expect(
      screen.getByText("La razon es requerida para descontar stock"),
    ).toBeInTheDocument();
  });

  it("refreshes the route after a successful stock adjustment", async () => {
    vi.mocked(adjustStockAction).mockResolvedValue({
      ok: true,
      message: "Stock actualizado",
      fieldErrors: {},
    });
    const user = userEvent.setup();

    render(<ProductStockDialog productId="product-1" productName="Arroz" />);

    await user.click(screen.getByRole("button", { name: "Ajustar stock" }));
    await user.type(screen.getByLabelText("Cantidad delta"), "1");
    await user.type(screen.getByLabelText("Razon"), "Conteo");
    await user.click(screen.getByRole("button", { name: "Guardar ajuste" }));

    expect(mocks.refresh).toHaveBeenCalled();
  });
});
