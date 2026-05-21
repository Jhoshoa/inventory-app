import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SalesReportSummary } from "./SalesReportSummary";
import type { SalesReport } from "../types";

const report: SalesReport = {
  from_date: "2026-05-01T00:00:00Z",
  to_date: "2026-05-20T23:59:59Z",
  total_sales: "120",
  sales_count: 3,
  items_count: 9,
  by_payment_method: [],
  top_products: [],
};

describe("SalesReportSummary", () => {
  it("renders totals and average ticket", () => {
    render(<SalesReportSummary report={report} />);

    expect(screen.getByText("Total vendido")).toBeInTheDocument();
    expect(screen.getByText("Ventas")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });
});
