import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeClosing } from "../test/fixtures";
import { ClosingsBrowser } from "./ClosingsBrowser";

function setWidth(width: number) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: width >= Number(/\d+/.exec(query)?.[0] ?? 0),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

const reports = [
  makeClosing(),
  makeClosing({ business_day_id: "day-2", business_date: "2026-11-08", counted_cash_amount: "512.00", cash_difference_amount: "0.00", closing_note: null }),
  makeClosing({ business_day_id: "day-3", business_date: "2026-11-07", counted_cash_amount: null, cash_difference_amount: null }),
];

describe("ClosingsBrowser", () => {
  beforeEach(() => setWidth(1440));

  it("shows each day's difference", () => {
    render(<ClosingsBrowser reports={reports} names={{ "u-1": "Rosa" }} />);
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent(/Lun 09\/11.*08:00–21:10.*Falta Bs\s?5,00/);
    expect(rows[1]).toHaveTextContent("Cuadra");
    expect(rows[2]).toHaveTextContent("Sin conteo");
  });

  it("opens the breakdown beside the table", async () => {
    const user = userEvent.setup();
    render(<ClosingsBrowser reports={reports} names={{ "u-1": "Rosa" }} />);

    await user.click(within(screen.getByRole("table")).getAllByRole("button")[0]);

    const panel = screen.getByRole("complementary", { name: "Resumen del cierre" });
    expect(within(panel).getByRole("heading", { name: "Lunes 09/11" })).toBeInTheDocument();
    expect(within(panel).getByText("= Efectivo esperado").nextElementSibling).toHaveTextContent(/Bs\s?905,00/);
    expect(within(panel).getByText("QR · Transferencia · Tarjeta").nextElementSibling).toHaveTextContent(/Bs\s?480,00/);
    expect(within(panel).getByText("38 · 1 · 91")).toBeInTheDocument();
    expect(within(panel).getByText("Rosa")).toBeInTheDocument();
    expect(within(panel).getByText(/Faltó cambio/)).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Ver página del cierre" })).toHaveAttribute("href", "/dashboard/reports/store-days/day-1");

    await user.click(within(panel).getByRole("button", { name: "Cerrar resumen" }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("uses a side window on tablets", async () => {
    setWidth(800);
    const user = userEvent.setup();
    render(<ClosingsBrowser reports={reports} names={{}} />);
    await user.click(within(screen.getByRole("table")).getAllByRole("button")[1]);
    expect(within(screen.getByRole("dialog")).getByText("Cuadra")).toBeInTheDocument();
  });
});
