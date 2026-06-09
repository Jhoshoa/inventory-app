import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StoreDayCloseReportsTable } from "./StoreDayCloseReportsTable";
import type { StoreDayCloseReport } from "../types";

describe("StoreDayCloseReportsTable", () => {
  it("renders close reports with mobile labels and detail action", () => {
    render(<StoreDayCloseReportsTable items={[closeReport()]} />);

    expect(screen.getAllByText("Fecha").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Efectivo esperado").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Diferencia").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Ver cierre" })).toHaveAttribute(
      "href",
      "/dashboard/reports/store-days/day-1",
    );
  });

  it("renders an empty state", () => {
    render(<StoreDayCloseReportsTable items={[]} />);

    expect(screen.getByText("Sin cierres registrados")).toBeInTheDocument();
  });
});

function closeReport(overrides: Partial<StoreDayCloseReport> = {}): StoreDayCloseReport {
  return {
    business_day_id: "day-1",
    business_date: "2026-06-07",
    status: "closed",
    opening_cash_amount: "100.00",
    sales_total: "185.50",
    sales_count: 1,
    voided_sales_count: 0,
    items_count: 2,
    cash_sales_total: "185.50",
    qr_sales_total: "0.00",
    transfer_sales_total: "0.00",
    card_sales_total: "0.00",
    cash_movements_in_total: "0.00",
    cash_movements_out_total: "0.00",
    cash_movements_count: 0,
    expected_cash_amount: "285.50",
    closed_at: "2026-06-07T20:00:00Z",
    closed_by_user_id: "user-1",
    counted_cash_amount: "285.50",
    cash_difference_amount: "0.00",
    closing_note: null,
    closing_snapshot_at: "2026-06-07T20:00:00Z",
    ...overrides,
  };
}
