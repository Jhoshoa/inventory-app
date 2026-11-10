import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StorefrontRequestResponse } from "../types";
import { StorefrontRequestsTable } from "./StorefrontRequestsTable";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../actions", () => ({
  updateStorefrontRequestPaymentAction: vi.fn(),
  updateStorefrontRequestStatusAction: vi.fn(),
}));

const base: StorefrontRequestResponse = {
  id: "r-1",
  product_id: "p-1",
  product_name: "Martillo",
  customer_name: "Juan Perez",
  customer_phone: "59170011122",
  note: null,
  status: "pending",
  payment_confirmed: false,
  created_at: "2026-11-10T12:00:00Z",
  items: [],
  total: null,
  delivery_method: null,
};

describe("StorefrontRequestsTable", () => {
  it("shows each line, the total and the delivery of a boleta", () => {
    render(
      <StorefrontRequestsTable
        requests={[
          {
            ...base,
            product_name: "Martillo y 1 mas",
            items: [
              { product_id: "p-1", product_name: "Martillo", unit: "unidad", quantity: 1, unit_price: "45.00", line_total: "45.00" },
              { product_id: "p-2", product_name: "Clavos", unit: "caja", quantity: 3, unit_price: "5.00", line_total: "15.00" },
            ],
            total: "60.00",
            delivery_method: "delivery",
          },
        ]}
      />,
    );

    expect(screen.getAllByText("1 x Martillo")[0]).toBeInTheDocument();
    expect(screen.getAllByText("3 x Clavos")[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Total\s+Bs\s*60,00/)[0]).toBeInTheDocument();
    expect(screen.getAllByText("Envio a domicilio")[0]).toBeInTheDocument();
    const whatsapp = screen.getAllByRole("link", { name: /WhatsApp/ })[0];
    expect(decodeURIComponent(whatsapp.getAttribute("href") ?? "")).toContain("tu pedido de Bs");
  });

  it("keeps showing old single-product requests by name", () => {
    render(<StorefrontRequestsTable requests={[base]} />);

    expect(screen.getAllByText("Martillo")[0]).toBeInTheDocument();
  });
});
