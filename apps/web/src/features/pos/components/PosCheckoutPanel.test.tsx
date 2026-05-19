import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PosCheckoutPanel } from "./PosCheckoutPanel";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [
      {
        ok: false,
        fieldErrors: { items: "Agrega al menos un producto" },
      },
      vi.fn(),
      false,
    ],
  };
});

describe("PosCheckoutPanel", () => {
  it("disables checkout for an empty cart and renders validation errors", () => {
    render(<PosCheckoutPanel items={[]} />);

    expect(screen.getByText("Agrega al menos un producto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar venta" })).toBeDisabled();
  });
});
