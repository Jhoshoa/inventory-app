import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { DashboardOverview } from "./DashboardOverview";
import { createEmptyDashboardSummary } from "../api";

describe("DashboardOverview", () => {
  it("renders the empty state", () => {
    render(<DashboardOverview summary={{ ok: true, data: createEmptyDashboardSummary() }} />);

    expect(screen.getByText("Tu tienda aun no tiene actividad")).toBeInTheDocument();
    expect(screen.getByText("Sin ventas recientes")).toBeInTheDocument();
  });

  it("renders the error state", () => {
    render(
      <DashboardOverview
        summary={{
          ok: false,
          error: new ApiError({
            status: 500,
            code: "server_error",
            message: "Backend unavailable",
          }),
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Backend unavailable");
  });

  it("renders latest sales with products, quantity, and date", () => {
    const createdAt = "2026-05-19T10:00:00Z";

    render(
      <DashboardOverview
        summary={{
          ok: true,
          data: {
            ...createEmptyDashboardSummary(),
            products_total: 1,
            latest_sales: [
              {
                id: "sale-12345678",
                total: "45.50",
                payment_method: "efectivo",
                created_at: createdAt,
                items: [
                  {
                    product_id: "product-1",
                    product_name: "Cafe molido",
                    quantity: 2,
                    unit_price: "10.00",
                    subtotal: "20.00",
                  },
                  {
                    product_id: "product-2",
                    product_name: "Azucar",
                    quantity: 1,
                    unit_price: "25.50",
                    subtotal: "25.50",
                  },
                ],
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getAllByText("Producto").length).toBeGreaterThan(0);
    expect(screen.getByText("Cantidad")).toBeInTheDocument();
    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Cafe molido, Azucar")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(datePrefix(createdAt), { exact: false })).toBeInTheDocument();
  });
});

function datePrefix(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
  }).format(new Date(value));
}
