import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoidSaleDialog } from "./VoidSaleDialog";

const mocks = vi.hoisted(() => ({
  actionState: {
    ok: false,
    fieldErrors: { reason: "La razon es requerida" },
  } as { ok: boolean; message?: string; fieldErrors: Record<string, string> },
  refresh: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [mocks.actionState, vi.fn(), false],
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

describe("VoidSaleDialog", () => {
  beforeEach(() => {
    mocks.actionState = {
      ok: false,
      fieldErrors: { reason: "La razon es requerida" },
    };
    mocks.refresh.mockClear();
  });

  it("opens the void form and shows validation errors", async () => {
    const user = userEvent.setup();
    render(<VoidSaleDialog saleId="sale-1" />);

    await user.click(screen.getByRole("button", { name: "Anular venta" }));

    expect(screen.getByRole("heading", { name: "Anular venta" })).toBeInTheDocument();
    expect(screen.getByText("La razon es requerida")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar anulacion" })).toBeEnabled();
  });

  it("refreshes the route after a successful void", () => {
    mocks.actionState = { ok: true, message: "Venta anulada", fieldErrors: {} };

    render(<VoidSaleDialog saleId="sale-1" />);

    expect(mocks.refresh).toHaveBeenCalled();
  });
});
