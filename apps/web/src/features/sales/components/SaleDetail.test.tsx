import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaleDetail } from "./SaleDetail";
import type { Sale } from "../types";

const sale: Sale = {
  id: "sale-12345678",
  items: [
    {
      product_id: "product-1",
      product_name: "Arroz 1kg",
      quantity: 2,
      unit_price: "12.50",
      subtotal: "25.00",
    },
  ],
  total: "25.00",
  payment_method: "efectivo",
  status: "voided",
  created_at: "2026-05-19T10:00:00Z",
  voided_at: "2026-05-19T11:00:00Z",
  void_reason: "Error de cobro",
};

describe("SaleDetail", () => {
  it("renders sale items, status, and void reason", () => {
    render(<SaleDetail sale={sale} />);

    expect(screen.getByRole("heading", { name: "Venta sale-123" })).toBeInTheDocument();
    expect(screen.getByText("Anulada")).toBeInTheDocument();
    expect(screen.getByText(/Error de cobro/)).toBeInTheDocument();
    expect(screen.getByText("Arroz 1kg")).toBeInTheDocument();
    expect(screen.getAllByText(/Bs\s+25,00/)).toHaveLength(2);
  });
});
