import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductDeleteDialog } from "./ProductDeleteDialog";

const mocks = vi.hoisted(() => ({
  actionState: {
    ok: false,
    fieldErrors: { confirm: "Escribe ELIMINAR para confirmar" },
  } as { ok: boolean; message?: string; fieldErrors: Record<string, string> },
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [mocks.actionState, vi.fn(), false],
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }),
}));

describe("ProductDeleteDialog", () => {
  beforeEach(() => {
    mocks.actionState = {
      ok: false,
      fieldErrors: { confirm: "Escribe ELIMINAR para confirmar" },
    };
    mocks.refresh.mockClear();
    mocks.replace.mockClear();
  });

  it("requires confirmation", async () => {
    render(<ProductDeleteDialog productId="product-1" productName="Arroz" />);

    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(screen.getByText("Escribe ELIMINAR para confirmar")).toBeInTheDocument();
  });

  it("returns to products after a successful delete", () => {
    mocks.actionState = { ok: true, message: "Producto eliminado", fieldErrors: {} };

    render(<ProductDeleteDialog productId="product-1" productName="Arroz" />);

    expect(mocks.replace).toHaveBeenCalledWith("/dashboard/products");
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
