import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SaleDetail } from "./SaleDetail";
import type { Sale } from "../types";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useActionState: () => [{ ok: false, fieldErrors: {} }, vi.fn(), false] };
});

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
  business_day_id: "day-1",
  business_date: "2026-05-19",
  created_by_user_id: "user-1",
  created_at: "2026-05-19T10:00:00Z",
  voided_at: "2026-05-19T11:00:00Z",
  void_reason: "Error de cobro",
};

describe("SaleDetail", () => {
  it("renders sale items, status, and void reason", () => {
    render(<SaleDetail sale={sale} role="owner" />);

    expect(screen.getByRole("heading", { name: "Venta sale-123" })).toBeInTheDocument();
    expect(screen.getByText("Anulada")).toBeInTheDocument();
    expect(screen.getByText(/Error de cobro/)).toBeInTheDocument();
    expect(screen.getByText("Arroz 1kg")).toBeInTheDocument();
    expect(screen.getAllByText(/Bs\s+25,00/)).toHaveLength(2);
  });

  it("hides void action for cashier", () => {
    render(<SaleDetail sale={{ ...sale, status: "completed", voided_at: null, void_reason: null }} role="cashier" />);

    expect(screen.queryByRole("button", { name: /anular venta/i })).not.toBeInTheDocument();
  });

  it("shows void action for owner", () => {
    render(<SaleDetail sale={{ ...sale, status: "completed", voided_at: null, void_reason: null }} role="owner" />);

    expect(screen.getByRole("button", { name: /anular venta/i })).toBeInTheDocument();
  });
});
