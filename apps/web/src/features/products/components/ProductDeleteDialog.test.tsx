import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductDeleteDialog } from "./ProductDeleteDialog";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [
      {
        ok: false,
        fieldErrors: { confirm: "Escribe ELIMINAR para confirmar" },
      },
      vi.fn(),
      false,
    ],
  };
});

describe("ProductDeleteDialog", () => {
  it("requires confirmation", async () => {
    render(<ProductDeleteDialog productId="product-1" productName="Arroz" />);

    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(screen.getByText("Escribe ELIMINAR para confirmar")).toBeInTheDocument();
  });
});
