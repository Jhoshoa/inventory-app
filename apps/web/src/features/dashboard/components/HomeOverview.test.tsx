import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/session";
import type { SalesReport } from "@/features/reports/types";
import type { DashboardSummary } from "../types";
import { HomeOverview, type HomeData } from "./HomeOverview";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const session: Session = {
  userId: "u-1",
  email: "rosa@example.com",
  storeId: "s-1",
  storeName: "Tienda Local",
  fullName: "Rosa Quispe",
  role: "owner",
  trialExpiresAt: null,
  daysUntilTrialEnds: null,
  subscriptionStatus: null,
  accessStatus: null,
};

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    sales_today_total: "1248.50",
    sales_today_count: 37,
    products_total: 19,
    low_stock_count: 5,
    out_of_stock_count: 1,
    latest_sales: [
      {
        id: "sale-1",
        total: "41.00",
        payment_method: "efectivo",
        status: "completed",
        created_at: "2026-11-10T15:42:00Z",
        items: [
          { product_id: "p-1", product_name: "Coca Cola 2l", quantity: 2 },
          { product_id: "p-2", product_name: "Papas Fritas 120g", quantity: 1 },
        ],
      },
      { id: "sale-2", total: "12.50", payment_method: "qr", status: "voided", created_at: "2026-11-10T15:30:00Z", items: [] },
    ],
    low_stock_products: [
      { id: "p-3", name: "Leche Pil 1l", stock: 2 },
      { id: "p-4", name: "Pan de batalla", stock: 1 },
      { id: "p-5", name: "Yogur", stock: 0 },
    ],
    exchange_rates: [],
    scope: "today",
    from_date: "2026-11-10",
    to_date: "2026-11-10",
    timezone: "America/La_Paz",
    first_business_date: null,
    expiring_batches_count: 3,
    expired_batches_count: 1,
    expiry_alerts: [
      {
        id: "b-1",
        product_id: "p-6",
        expires_on: "2026-11-13",
        alert_days: 5,
        quantity_initial: 8,
        quantity_remaining: 8,
        created_at: "2026-11-01T12:00:00Z",
        days_left: 3,
        status: "expiring",
        product_name: "Yogur Frutilla",
        product_unit: "unidad",
      },
    ],
    ...overrides,
  };
}

const sales: SalesReport = {
  from_date: "2026-11-10",
  to_date: "2026-11-10",
  first_business_date: null,
  total_sales: "1248.50",
  sales_count: 37,
  items_count: 64,
  by_payment_method: [
    { payment_method: "efectivo", total: "742.00", count: 22 },
    { payment_method: "qr", total: "318.50", count: 9 },
    { payment_method: "tarjeta", total: "0", count: 0 },
  ],
  top_products: [],
};

function data(overrides: Partial<HomeData> = {}): HomeData {
  return {
    period: "today",
    today: "2026-11-10",
    summary: { ok: true, data: summary() },
    sales,
    previousSales: { ...sales, total_sales: "1114.73" },
    comparisonLabel: "el martes pasado",
    pendingOrders: { count: 2, oldestAt: new Date(Date.now() - 25 * 60000).toISOString() },
    cash: { isOpen: true, openedAt: "2026-11-10T12:02:00Z", expectedCash: "862.00" },
    ...overrides,
  };
}

describe("HomeOverview", () => {
  beforeEach(() => push.mockReset());

  it("shows the period KPIs with the comparison", () => {
    render(<HomeOverview session={session} data={data()} />);

    expect(screen.getByRole("heading", { name: "Inicio", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Martes 10 de noviembre")).toBeInTheDocument();
    expect(screen.getByText(/, Rosa\./)).toBeInTheDocument();
    const kpis = screen.getByRole("region", { name: "Resumen del periodo" });
    expect(within(kpis).getByText("Ventas de hoy")).toBeInTheDocument();
    expect(within(kpis).getByText(/Bs\s?1\.248,50/)).toBeInTheDocument();
    expect(within(kpis).getByText("↑ 12% vs. el martes pasado")).toBeInTheDocument();
    expect(within(kpis).getByText("37")).toBeInTheDocument();
    expect(within(kpis).getByText(/Promedio Bs\s?33,74/)).toBeInTheDocument();
    expect(within(kpis).getByText("Productos vendidos")).toBeInTheDocument();
    expect(within(kpis).getByText("64")).toBeInTheDocument();
    expect(within(kpis).getByText("Distintos, en 37 ventas")).toBeInTheDocument();
    expect(within(kpis).getByText("El más antiguo hace 25 min")).toBeInTheDocument();
  });

  it("period tabs keep the choice in the URL", () => {
    render(<HomeOverview session={session} data={data({ period: "7d" })} />);
    const tabs = screen.getByRole("navigation", { name: "Periodo" });
    expect(within(tabs).getByRole("link", { name: "7 días" })).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "Hoy" })).toHaveAttribute("href", "/dashboard");
    expect(within(tabs).getByRole("link", { name: "Mes" })).toHaveAttribute("href", "/dashboard?scope=month");
    expect(screen.getByText("Ventas de los últimos 7 días")).toBeInTheDocument();
  });

  it("explains when there is nothing to compare", () => {
    render(<HomeOverview session={session} data={data({ previousSales: { ...sales, total_sales: "0" } })} />);
    expect(screen.getByText("Sin ventas para comparar con el martes pasado")).toBeInTheDocument();
  });

  it("breaks down how people paid, without empty methods", () => {
    render(<HomeOverview session={session} data={data()} />);
    const section = screen.getByRole("region", { name: "Cómo te pagaron" });
    expect(within(section).getByText("Efectivo")).toBeInTheDocument();
    expect(within(section).getByText(/· 22 ventas/)).toBeInTheDocument();
    expect(within(section).queryByText("Tarjeta")).not.toBeInTheDocument();
  });

  it("lists what needs attention with links to act", () => {
    render(<HomeOverview session={session} data={data()} />);
    const section = screen.getByRole("region", { name: "Necesita atención" });
    expect(within(section).getByRole("link", { name: /3 lotes por vencer · 1 vencido/ })).toHaveAttribute(
      "href",
      "/dashboard/products?stock=expiring",
    );
    expect(within(section).getByText("Yogur Frutilla · 8 u.")).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: /5 productos con stock bajo/ })).toHaveAttribute(
      "href",
      "/dashboard/products?stock=low",
    );
    expect(within(section).getByText("Leche Pil 1l, Pan de batalla y 3 más")).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: /2 pedidos del catálogo/ })).toHaveAttribute("href", "/dashboard/solicitudes");
  });

  it("says everything is fine when nothing needs attention", () => {
    render(
      <HomeOverview
        session={session}
        data={data({
          summary: { ok: true, data: summary({ low_stock_count: 0, expiring_batches_count: 0, expired_batches_count: 0 }) },
          pendingOrders: { count: 0, oldestAt: null },
        })}
      />,
    );
    expect(screen.getByText(/Todo en orden/)).toBeInTheDocument();
  });

  it("shows the latest sales linking to each one", () => {
    render(<HomeOverview session={session} data={data()} />);
    const section = screen.getByRole("region", { name: "Últimas ventas" });
    expect(within(section).getByRole("link", { name: /Coca Cola 2l × 2, Papas Fritas 120g/ })).toHaveAttribute(
      "href",
      "/dashboard/sales/sale-1",
    );
    expect(within(section).getByText(/11:42 · Efectivo/)).toBeInTheDocument();
    expect(within(section).getByText(/· Anulada/)).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: /Ver todas/ })).toHaveAttribute("href", "/dashboard/sales");
  });

  it("shows exchange rates when the API sends them", () => {
    render(
      <HomeOverview
        session={session}
        data={data({
          summary: {
            ok: true,
            data: summary({ exchange_rates: [{ id: "", source: "Oficial", buy_price: "6.86", sell_price: "6.96" }] }),
          },
        })}
      />,
    );
    expect(screen.getByRole("heading", { name: "Tipo de cambio" })).toBeInTheDocument();
    expect(screen.getByText("Compra 6.86 · Venta 6.96")).toBeInTheDocument();
  });

  it("a new store sees how to start", () => {
    render(
      <HomeOverview
        session={session}
        data={data({ summary: { ok: true, data: summary({ products_total: 0, sales_today_count: 0, latest_sales: [] }) } })}
      />,
    );
    expect(screen.getByText("Tu tienda todavía no tiene productos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agregar productos" })).toHaveAttribute("href", "/dashboard/products/new");
  });

  it("shows an error card when the summary fails", () => {
    render(
      <HomeOverview
        session={session}
        data={data({ summary: { ok: false, error: { code: "server_error", message: "Fallo", status: 500 } } as HomeData["summary"] })}
      />,
    );
    expect(screen.getByRole("heading", { name: "Inicio", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Fallo/)).toBeInTheDocument();
  });

  it("works when optional data fails to load", () => {
    render(<HomeOverview session={session} data={data({ sales: null, previousSales: null, pendingOrders: null, cash: null })} />);
    expect(screen.getAllByText("No se pudo cargar").length).toBeGreaterThan(0);
    expect(screen.getByText(/Bs\s?1\.248,50/)).toBeInTheDocument();
  });

  it("phone chips show the cash register and pending orders", () => {
    render(<HomeOverview session={session} data={data()} />);
    expect(screen.getByRole("link", { name: "Caja abierta desde 08:02" })).toHaveAttribute("href", "/dashboard/caja");
    expect(screen.getByRole("link", { name: "2 pedidos" })).toHaveAttribute("href", "/dashboard/solicitudes");
  });

  it("search opens Productos and asks for 3 letters", () => {
    render(<HomeOverview session={session} data={data()} />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "co" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByRole("status")).toHaveTextContent("Escribe al menos 3 letras");
    expect(push).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "coca" } });
    fireEvent.submit(input.closest("form")!);
    expect(push).toHaveBeenCalledWith("/dashboard/products?q=coca");
  });
});
