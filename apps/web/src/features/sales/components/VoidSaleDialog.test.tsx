import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VoidSaleDialog } from "./VoidSaleDialog";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [
      {
        ok: false,
        fieldErrors: { reason: "La razon es requerida" },
      },
      vi.fn(),
      false,
    ],
  };
});

describe("VoidSaleDialog", () => {
  it("opens the void form and shows validation errors", async () => {
    const user = userEvent.setup();
    render(<VoidSaleDialog saleId="sale-1" />);

    await user.click(screen.getByRole("button", { name: "Anular venta" }));

    expect(screen.getByRole("heading", { name: "Anular venta" })).toBeInTheDocument();
    expect(screen.getByText("La razon es requerida")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar anulacion" })).toBeEnabled();
  });
});
