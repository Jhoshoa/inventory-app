import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { voidSaleAction } from "../actions";
import { makeSale } from "../test/fixtures";
import { VoidSaleDialog } from "./VoidSaleDialog";

vi.mock("../actions", () => ({ voidSaleAction: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function setup() {
  const props = { onOpenChange: vi.fn(), onVoided: vi.fn(), onConflict: vi.fn() };
  render(<VoidSaleDialog sale={makeSale()} open {...props} />);
  return { user: userEvent.setup(), ...props };
}

describe("VoidSaleDialog", () => {
  beforeEach(() => vi.mocked(voidSaleAction).mockReset());

  it("asks with the total and the units that go back to stock", () => {
    setup();
    expect(screen.getByRole("heading", { name: /¿Anular la venta de Bs\s?46,2/ })).toBeInTheDocument();
    expect(screen.getByText(/Las 5 unidades vuelven al stock/)).toBeInTheDocument();
  });

  it("requires a reason before calling the API", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Anular venta" }));
    expect(screen.getByText("La razón es requerida.")).toBeInTheDocument();
    expect(screen.getByLabelText("Razón")).toHaveAttribute("aria-invalid", "true");
    expect(voidSaleAction).not.toHaveBeenCalled();
  });

  it("fills the reason from a quick chip and voids", async () => {
    const voided = makeSale({ status: "voided", void_reason: "Venta duplicada" });
    vi.mocked(voidSaleAction).mockResolvedValue({ ok: true, fieldErrors: {}, sale: voided });
    const { user, onVoided, onOpenChange } = setup();

    await user.click(screen.getByRole("button", { name: "Venta duplicada" }));
    expect(screen.getByLabelText("Razón")).toHaveValue("Venta duplicada");
    await user.click(screen.getByRole("button", { name: "Anular venta" }));

    const formData = vi.mocked(voidSaleAction).mock.calls[0][1];
    expect(formData.get("reason")).toBe("Venta duplicada");
    expect(onVoided).toHaveBeenCalledWith(voided);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("reloads the sale when it was already voided (409)", async () => {
    vi.mocked(voidSaleAction).mockResolvedValue({ ok: false, fieldErrors: {}, message: "La venta ya fue anulada", conflict: true });
    const { user, onConflict, onVoided } = setup();

    await user.type(screen.getByLabelText("Razón"), "Error al cobrar");
    await user.click(screen.getByRole("button", { name: "Anular venta" }));

    expect(onConflict).toHaveBeenCalled();
    expect(onVoided).not.toHaveBeenCalled();
  });
});
