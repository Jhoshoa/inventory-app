import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PosCheckoutPanel } from "./PosCheckoutPanel";
import type { CartItem } from "../types";

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
    expect(screen.getByText("En espera")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Carrito vacio" })).toBeDisabled();
  });

  it("highlights checkout readiness and total when cart has items", () => {
    const items: CartItem[] = [
      {
        product: {
          id: "product-1",
          name: "Arroz 1kg",
          price: "12.50",
          stock: 5,
          unit: "unidad",
          qr_code: null,
        },
        quantity: 2,
      },
    ];

    render(<PosCheckoutPanel items={items} />);

    expect(screen.getByText("Listo")).toBeInTheDocument();
    expect(screen.getByText("Venta lista para confirmar.")).toBeInTheDocument();
    expect(screen.getByText(/Bs\s+25,00/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar venta" })).toBeEnabled();
  });
});
