import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { DashboardOverview } from "./DashboardOverview";
import { createEmptyDashboardSummary } from "../api";

describe("DashboardOverview", () => {
  it("renders the empty state", () => {
    render(<DashboardOverview summary={{ ok: true, data: createEmptyDashboardSummary() }} />);

    expect(screen.getByText("Tu tienda aun no tiene actividad")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a productos" })).toHaveAttribute(
      "href",
      "/dashboard/products",
    );
    expect(screen.getByText("Sin ventas recientes")).toBeInTheDocument();
  });

  it("renders the error state", () => {
    render(
      <DashboardOverview
        scope="month"
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

  it("renders premium summary context, low stock and exchange rates", () => {
    render(
      <DashboardOverview
        scope="month"
        summary={{
          ok: true,
          data: {
            ...createEmptyDashboardSummary(),
            scope: "month",
            from_date: "2026-05-01",
            to_date: "2026-05-28",
            sales_today_total: "120.25",
            sales_today_count: 4,
            products_total: 8,
            low_stock_count: 1,
            out_of_stock_count: 1,
            low_stock_products: [{ id: "product-1", name: "Cafe", stock: 0, min_stock: 2 }],
            exchange_rates: [
              {
                id: "rate-1",
                source: "bcb",
                buy_price: "36.50",
                sell_price: "37.00",
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "Mes" })).toHaveAttribute("href", "/dashboard?scope=month");
    expect(screen.getByRole("link", { name: "Mes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(/120,25/)).toBeInTheDocument();
    expect(screen.getByText("01-may - 28-may")).toBeInTheDocument();
    expect(screen.getByText("1 sin stock")).toBeInTheDocument();
    expect(screen.getByText("Cafe")).toBeInTheDocument();
    expect(screen.getByText("Sin stock")).toBeInTheDocument();
    expect(screen.getByText("bcb")).toBeInTheDocument();
    expect(screen.getByText("36.50 / 37.00")).toBeInTheDocument();
  });

  it("uses the requested scope to mark the active dashboard tab", () => {
    render(
      <DashboardOverview
        scope="month"
        summary={{
          ok: true,
          data: {
            ...createEmptyDashboardSummary(),
            products_total: 1,
            scope: "today",
          },
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "Mes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Hoy" })).not.toHaveAttribute("aria-current");
  });

  it("renders exchange rates even when ids are missing or duplicated", () => {
    render(
      <DashboardOverview
        summary={{
          ok: true,
          data: {
            ...createEmptyDashboardSummary(),
            products_total: 1,
            exchange_rates: [
              {
                id: "",
                source: "bcb",
                buy_price: "36.50",
                sell_price: "37.00",
              },
              {
                id: "",
                source: "paralelo",
                buy_price: "40.00",
                sell_price: "41.00",
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText("bcb")).toBeInTheDocument();
    expect(screen.getByText("paralelo")).toBeInTheDocument();
  });
});

function datePrefix(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
  }).format(new Date(value));
}
