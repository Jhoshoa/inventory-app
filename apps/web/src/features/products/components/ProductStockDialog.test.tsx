import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductStockDialog } from "./ProductStockDialog";

const mocks = vi.hoisted(() => ({
  actionState: {
    ok: false,
    fieldErrors: { reason: "La razon es requerida para descontar stock" },
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

describe("ProductStockDialog", () => {
  beforeEach(() => {
    mocks.actionState = {
      ok: false,
      fieldErrors: { reason: "La razon es requerida para descontar stock" },
    };
    mocks.refresh.mockClear();
  });

  it("shows validation errors from stock action state", async () => {
    render(<ProductStockDialog productId="product-1" productName="Arroz" />);

    await userEvent.click(screen.getByRole("button", { name: "Ajustar stock" }));

    expect(
      screen.getByText("La razon es requerida para descontar stock"),
    ).toBeInTheDocument();
  });

  it("refreshes the route after a successful stock adjustment", () => {
    mocks.actionState = { ok: true, message: "Stock actualizado", fieldErrors: {} };

    render(<ProductStockDialog productId="product-1" productName="Arroz" />);

    expect(mocks.refresh).toHaveBeenCalled();
  });
});
