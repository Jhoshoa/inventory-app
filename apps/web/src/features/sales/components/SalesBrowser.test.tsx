import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { voidSaleAction } from "../actions";
import { makeSale } from "../test/fixtures";
import type { SaleListResponse } from "../types";
import { SalesBrowser } from "./SalesBrowser";

vi.mock("../actions", () => ({ voidSaleAction: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const store = { name: "Tienda Local" };
const today = "2026-11-10";

function listResponse(items = [makeSale(), makeSale({ id: "c1d2e3f4-voided", status: "voided", total: "12.00" })], total = items.length): SaleListResponse {
  return {
    items,
    total,
    limit: 50,
    offset: 0,
    from_date: today,
    to_date: today,
    timezone: "America/La_Paz",
    first_business_date: "2026-11-01",
  };
}

function setWide(wide: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: wide,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

function renderBrowser(role = "owner", data = listResponse()) {
  return render(
    <SalesBrowser
      initialFilters={{ from_date: today, to_date: today, status: "all" }}
      initialData={data}
      initialSummary={{ count: 1, total: 46.2, byMethod: [{ method: "efectivo", total: 46.2 }], voided: 1 }}
      role={role}
      store={store}
      today={today}
    />,
  );
}

describe("SalesBrowser", () => {
  beforeEach(() => setWide(true));
  afterEach(() => vi.unstubAllGlobals());

  it("shows the range summary, the day group and the voided count", () => {
    renderBrowser();
    expect(screen.getByText("1 venta · Bs 46,20 · 1 anulada".replace(/ /g, " "), { normalizer: (text) => text.replace(/\s+/g, " ") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anuladas · 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hoy" })).toHaveAttribute("aria-pressed", "true");
    const day = screen.getByRole("region", { name: "Martes 10/11" });
    // Las anuladas no suman al total del día.
    expect(within(day).getByRole("heading")).toHaveTextContent(/Bs\s?46,2/);
    expect(within(day).getAllByRole("link")[0]).toHaveAttribute("href", `/dashboard/sales/${makeSale().id}`);
  });

  it("hides export for the cashier", () => {
    const { unmount } = renderBrowser("owner");
    expect(screen.getByRole("link", { name: /Exportar/ })).toHaveAttribute("href", "/api/exports/sales?from_date=2026-11-10&to_date=2026-11-10");
    unmount();
    renderBrowser("cashier");
    expect(screen.queryByRole("link", { name: /Exportar/ })).not.toBeInTheDocument();
  });

  it("opens the detail beside the table and closes it", async () => {
    const user = userEvent.setup();
    renderBrowser();

    await user.click(screen.getByRole("button", { name: /Ver venta de Bs\s?46,2/ }));
    const panel = screen.getByRole("complementary", { name: "Detalle de la venta" });
    expect(within(panel).getByRole("heading", { name: "Venta b07038f2" })).toBeInTheDocument();
    expect(within(panel).getByText("Hoy 11:47 · Luis · En línea")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Abrir página de la venta" })).toHaveAttribute("href", `/dashboard/sales/${makeSale().id}`);
    expect(within(panel).getByRole("button", { name: "Anular venta" })).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Cerrar detalle" }));
    expect(screen.queryByRole("complementary", { name: "Detalle de la venta" })).not.toBeInTheDocument();
  });

  it("opens the detail in a side window on tablets", async () => {
    setWide(false);
    const user = userEvent.setup();
    renderBrowser();

    await user.click(screen.getByRole("button", { name: /Ver venta de Bs\s?46,2/ }));
    expect(within(screen.getByRole("dialog")).getByText("Venta b07038f2")).toBeInTheDocument();
  });

  it("asks the API again when a filter changes and keeps it in the address", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith("/api/reports/sales")) {
        return Response.json({ total_sales: "0", sales_count: 0, items_count: 0, by_payment_method: [], top_products: [], from_date: "", to_date: "", first_business_date: null });
      }
      return Response.json(listResponse([], 0));
    });
    vi.stubGlobal("fetch", fetchMock);
    const replaceState = vi.spyOn(window.history, "replaceState");
    const user = userEvent.setup();
    renderBrowser();

    await user.click(screen.getByRole("button", { name: "Ayer" }));

    await waitFor(() => expect(screen.getByText("Sin ventas en estas fechas")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/sales?from_date=2026-11-09&to_date=2026-11-09&limit=50&offset=0",
      expect.anything(),
    );
    expect(replaceState).toHaveBeenCalledWith(null, "", "?from_date=2026-11-09&to_date=2026-11-09");
  });

  it("loads more sales at the end of the list", async () => {
    const more = makeSale({ id: "e5f6a7b8-more", created_at: "2026-11-09T15:00:00Z" });
    const fetchMock = vi.fn(async () => Response.json({ ...listResponse([more], 3), offset: 2 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderBrowser("owner", listResponse(undefined, 3));

    await user.click(screen.getByRole("button", { name: "Ver más ventas (2 de 3)" }));

    await waitFor(() => expect(screen.getByRole("region", { name: "Lunes 09/11" })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/sales?from_date=2026-11-10&to_date=2026-11-10&limit=50&offset=2", expect.anything());
    expect(screen.queryByRole("button", { name: /Ver más ventas/ })).not.toBeInTheDocument();
  });

  it("marks a sale voided from the panel and takes it out of the totals", async () => {
    vi.mocked(voidSaleAction).mockResolvedValue({
      ok: true,
      fieldErrors: {},
      sale: makeSale({ status: "voided", void_reason: "Error al cobrar", voided_by_name: "Rosa" }),
    });
    const user = userEvent.setup();
    renderBrowser();

    await user.click(screen.getByRole("button", { name: /Ver venta de Bs\s?46,2/ }));
    const panel = screen.getByRole("complementary", { name: "Detalle de la venta" });
    await user.click(within(panel).getByRole("button", { name: "Anular venta" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Error al cobrar" }));
    await user.click(within(dialog).getByRole("button", { name: "Anular venta" }));

    await waitFor(() => expect(within(panel).getByText("Razón: Error al cobrar")).toBeInTheDocument());
    expect(within(panel).queryByRole("button", { name: "Anular venta" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anuladas · 2" })).toBeInTheDocument();
    expect(screen.getByText(/^0 ventas · Bs\s?0,00 · 2 anuladas$/)).toBeInTheDocument();
  });
});
