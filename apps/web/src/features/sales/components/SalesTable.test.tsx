import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SalesTable } from "./SalesTable";
import type { Sale } from "../types";

const sale: Sale = {
  id: "sale-1",
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
  status: "completed",
  business_day_id: "day-1",
  business_date: "2026-05-19",
  created_by_user_id: "user-1",
  created_at: "2026-05-19T10:00:00Z",
  voided_at: null,
  void_reason: null,
};

describe("SalesTable", () => {
  it("renders sales with status, total, and detail link", () => {
    render(<SalesTable sales={[sale]} />);

    expect(screen.getByText("Completada")).toBeInTheDocument();
    expect(screen.getByText("efectivo")).toBeInTheDocument();
    expect(screen.getByText(/Bs\s+25,00/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver venta" })).toHaveAttribute(
      "href",
      "/dashboard/sales/sale-1",
    );
  });

  it("renders an empty state", () => {
    render(<SalesTable sales={[]} />);

    expect(screen.getByText("Sin ventas registradas")).toBeInTheDocument();
  });
});
