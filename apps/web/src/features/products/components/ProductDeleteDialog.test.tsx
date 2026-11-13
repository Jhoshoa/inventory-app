import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteProductAction } from "../actions";
import { ProductDeleteDialog } from "./ProductDeleteDialog";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("../actions", () => ({ deleteProductAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

describe("ProductDeleteDialog", () => {
  beforeEach(() => {
    vi.mocked(deleteProductAction).mockReset();
    replace.mockReset();
  });

  it("enables Eliminar only with ELIMINAR exact", () => {
    render(<ProductDeleteDialog productId="p-1" productName="Yogur Frutilla" />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = screen.getByRole("dialog", { name: "¿Eliminar Yogur Frutilla?" });
    expect(within(dialog).getByText(/Las ventas pasadas y su historial se conservan/)).toBeInTheDocument();
    const button = within(dialog).getByRole("button", { name: "Eliminar producto" });
    expect(button).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Escribe ELIMINAR para confirmar"), { target: { value: "eliminar" } });
    expect(button).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Escribe ELIMINAR para confirmar"), { target: { value: "ELIMINAR" } });
    expect(button).toBeEnabled();
  });

  it("returns to Productos after deleting", async () => {
    vi.mocked(deleteProductAction).mockResolvedValue({ ok: true, fieldErrors: {} });
    render(<ProductDeleteDialog productId="p-1" productName="Yogur Frutilla" />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    fireEvent.change(screen.getByLabelText("Escribe ELIMINAR para confirmar"), { target: { value: "ELIMINAR" } });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar producto" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard/products"));
    expect(vi.mocked(deleteProductAction).mock.calls[0][1].get("product_id")).toBe("p-1");
  });
});
