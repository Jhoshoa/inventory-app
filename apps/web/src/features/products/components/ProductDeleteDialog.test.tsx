import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteProductAction } from "../actions";
import { ProductDeleteDialog } from "./ProductDeleteDialog";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("../actions", () => ({
  deleteProductAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }),
}));

describe("ProductDeleteDialog", () => {
  beforeEach(() => {
    vi.mocked(deleteProductAction).mockReset();
    mocks.refresh.mockClear();
    mocks.replace.mockClear();
  });

  it("requires confirmation", async () => {
    vi.mocked(deleteProductAction).mockResolvedValue({
      ok: false,
      fieldErrors: { confirm: "Escribe ELIMINAR para confirmar" },
    });
    const user = userEvent.setup();

    render(<ProductDeleteDialog productId="product-1" productName="Arroz" />);

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = screen.getByRole("heading", { name: "Eliminar producto" }).parentElement!;
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(screen.getByText("Escribe ELIMINAR para confirmar")).toBeInTheDocument();
  });

  it("returns to products after a successful delete", async () => {
    vi.mocked(deleteProductAction).mockResolvedValue({
      ok: true,
      message: "Producto eliminado",
      fieldErrors: {},
    });
    const user = userEvent.setup();

    render(<ProductDeleteDialog productId="product-1" productName="Arroz" />);

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.type(screen.getByLabelText("Confirmacion"), "ELIMINAR");
    const dialog = screen.getByRole("heading", { name: "Eliminar producto" }).parentElement!;
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(mocks.replace).toHaveBeenCalledWith("/dashboard/products");
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
