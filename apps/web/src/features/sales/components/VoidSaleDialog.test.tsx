import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { voidSaleAction } from "../actions";
import { VoidSaleDialog } from "./VoidSaleDialog";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("../actions", () => ({
  voidSaleAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

describe("VoidSaleDialog", () => {
  beforeEach(() => {
    vi.mocked(voidSaleAction).mockReset();
    mocks.refresh.mockClear();
  });

  it("opens the void form and shows validation errors", async () => {
    vi.mocked(voidSaleAction).mockResolvedValue({
      ok: false,
      fieldErrors: { reason: "La razon es requerida" },
    });
    const user = userEvent.setup();
    render(<VoidSaleDialog saleId="sale-1" />);

    await user.click(screen.getByRole("button", { name: "Anular venta" }));
    await user.click(screen.getByRole("button", { name: "Confirmar anulacion" }));

    expect(screen.getByRole("heading", { name: "Anular venta" })).toBeInTheDocument();
    expect(screen.getByText("La razon es requerida")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar anulacion" })).toBeEnabled();
  });

  it("refreshes the route after a successful void", async () => {
    vi.mocked(voidSaleAction).mockResolvedValue({
      ok: true,
      message: "Venta anulada",
      fieldErrors: {},
    });
    const user = userEvent.setup();

    render(<VoidSaleDialog saleId="sale-1" />);

    await user.click(screen.getByRole("button", { name: "Anular venta" }));
    await user.type(screen.getByLabelText("Razon"), "Error de cobro");
    await user.click(screen.getByRole("button", { name: "Confirmar anulacion" }));

    expect(mocks.refresh).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
