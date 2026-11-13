import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeReport } from "../test/fixtures";
import { SalesOverview, soldLabel } from "./SalesOverview";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard/reports" }));

const params = { range: "7d" as const, from: "2026-11-04", to: "2026-11-10" };

describe("SalesOverview", () => {
  it("shows totals, the comparison, voided, methods with counts and best sellers", () => {
    render(
      <SalesOverview
        report={makeReport()}
        comparison={{ percent: 6, label: "vs. semana anterior" }}
        voidedCount={3}
        params={params}
        role="owner"
        today="2026-11-10"
      />,
    );
    const summary = screen.getByRole("region", { name: "Resumen de ventas" });
    expect(within(summary).getAllByText(/Bs\s?8\.412,00/).length).toBeGreaterThan(0);
    expect(within(summary).getByText(/Subió/).parentElement).toHaveTextContent(/6% vs\. semana anterior/);
    expect(within(summary).getByText("3 anuladas")).toBeInTheDocument();
    expect(within(summary).getByText(/Bs\s?34,90/)).toBeInTheDocument();

    const methods = screen.getByRole("region", { name: "Cómo te pagaron" });
    const rows = within(methods).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(/Efectivo · 150 ventas/);
    expect(rows[1]).toHaveTextContent(/QR · 70 ventas/);

    const top = screen.getByRole("region", { name: "Más vendidos" });
    expect(within(top).getByText("Pan de batalla")).toBeInTheDocument();

    const more = screen.getByRole("navigation", { name: "Más reportes" });
    expect(within(more).getByRole("link", { name: "Cierres de caja" })).toHaveAttribute(
      "href",
      "/dashboard/reports/store-days?range=7d&from=2026-11-04&to=2026-11-10",
    );
    expect(within(more).getByRole("link", { name: "Descargar en CSV" })).toBeInTheDocument();
  });

  it("gives the cashier only Movimientos de stock", () => {
    render(<SalesOverview report={makeReport()} comparison={null} voidedCount={0} params={params} role="cashier" today="2026-11-10" />);
    const more = screen.getByRole("navigation", { name: "Más reportes" });
    expect(within(more).getAllByRole("link").map((link) => link.textContent)).toEqual(["Movimientos de stock"]);
  });

  it("says when there are no sales", () => {
    render(
      <SalesOverview
        report={makeReport({ sales_count: 0, total_sales: "0", items_count: 0, by_payment_method: [], top_products: [] })}
        comparison={null}
        voidedCount={0}
        params={params}
        role="owner"
        today="2026-11-10"
      />,
    );
    expect(screen.getByText("Sin ventas en este rango")).toBeInTheDocument();
  });

  it("writes the sold label like the mockup", () => {
    expect(soldLabel("2026-11-04", "2026-11-10", "2026-11-10")).toBe("Vendiste del 04 al 10/11");
    expect(soldLabel("2026-10-28", "2026-11-03", "2026-11-10")).toBe("Vendiste del 28/10 al 03/11");
    expect(soldLabel("2026-11-10", "2026-11-10", "2026-11-10")).toBe("Vendiste hoy");
    expect(soldLabel("2026-11-05", "2026-11-05", "2026-11-10")).toBe("Vendiste el 05/11");
  });
});
