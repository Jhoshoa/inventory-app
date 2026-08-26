import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PosCheckoutPanel } from "./PosCheckoutPanel";
import type { CartItem } from "../types";
import type { StoreResponse } from "@/features/settings/types";

const discountPolicy: StoreResponse = {
  id: "store-1",
  name: "Tienda",
  address: null,
  phone: null,
  is_active: true,
  allow_percentage_discount: false,
  max_percentage_discount: "0",
  allow_manual_discount: false,
  max_manual_discount_amount: "0",
  allow_cashier_discount_override: false,
};

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
    render(<PosCheckoutPanel items={[]} discountPolicy={discountPolicy} />);

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
          discount_type: null,
          discount_value: "0",
          effective_price: "12.50",
        },
        quantity: 2,
      },
    ];

    render(<PosCheckoutPanel items={items} discountPolicy={discountPolicy} />);

    expect(screen.getByText("Listo")).toBeInTheDocument();
    expect(screen.getByText("Venta lista para confirmar.")).toBeInTheDocument();
    expect(screen.getAllByText(/Bs\s+25,00/)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Confirmar venta" })).toBeEnabled();
  });

  it("shows the automatic product discount and applies it to the total", () => {
    const items: CartItem[] = [
      {
        product: {
          id: "product-1",
          name: "Aceite Oferta",
          price: "60.00",
          stock: 5,
          unit: "unidad",
          qr_code: null,
          discount_type: "fixed",
          discount_value: "15.00",
          effective_price: "45.00",
        },
        quantity: 1,
      },
    ];

    render(<PosCheckoutPanel items={items} discountPolicy={discountPolicy} />);

    expect(screen.getByText(/Descuento de producto disponible: Bs\s+15,00/)).toBeInTheDocument();
    expect(screen.getByText("Descuento de producto")).toBeInTheDocument();
    expect(screen.getAllByText(/Bs\s+45,00/).length).toBeGreaterThan(0);
  });

  it("lets the cashier override the discount source only when the store allows it", () => {
    const items: CartItem[] = [
      {
        product: {
          id: "product-1",
          name: "Aceite Oferta",
          price: "60.00",
          stock: 5,
          unit: "unidad",
          qr_code: null,
          discount_type: "fixed",
          discount_value: "15.00",
          effective_price: "45.00",
        },
        quantity: 1,
      },
    ];

    const { rerender } = render(<PosCheckoutPanel items={items} discountPolicy={discountPolicy} />);
    expect(screen.queryByLabelText("Que descuento aplicar")).not.toBeInTheDocument();

    rerender(
      <PosCheckoutPanel
        items={items}
        discountPolicy={{ ...discountPolicy, allow_cashier_discount_override: true }}
      />,
    );
    expect(screen.getByLabelText("Que descuento aplicar")).toBeInTheDocument();
  });
});
