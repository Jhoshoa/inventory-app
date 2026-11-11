import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  closeStoreDayAction,
  createCashMovementAction,
  openStoreDayAction,
  reopenStoreDayAction,
  voidCashMovementAction,
} from "../actions";
import type { CashMovement, StoreDay, StoreDayCloseReport, StoreDayClosingPreview } from "../types";
import { CashRegisterView, type CashRegisterData } from "./CashRegisterView";

const refresh = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push }),
  usePathname: () => "/dashboard/caja",
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../actions", () => ({
  openStoreDayAction: vi.fn(),
  closeStoreDayAction: vi.fn(),
  reopenStoreDayAction: vi.fn(),
  createCashMovementAction: vi.fn(),
  voidCashMovementAction: vi.fn(),
}));

function storeDay(overrides: Partial<StoreDay> = {}): StoreDay {
  return {
    id: null,
    status: "closed",
    business_date: "2026-11-10",
    opened_at: null,
    closed_at: null,
    opened_by_user_id: null,
    closed_by_user_id: null,
    opening_note: null,
    closing_note: null,
    opening_cash_amount: null,
    expected_cash_amount: null,
    counted_cash_amount: null,
    cash_difference_amount: null,
    closing_sales_total: null,
    closing_sales_count: null,
    closing_voided_sales_count: null,
    closing_items_count: null,
    closing_cash_sales_total: null,
    closing_qr_sales_total: null,
    closing_transfer_sales_total: null,
    closing_card_sales_total: null,
    closing_cash_movements_in_total: null,
    closing_cash_movements_out_total: null,
    closing_cash_movements_count: null,
    closing_snapshot_at: null,
    sales_total: null,
    sales_count: null,
    voided_sales_count: null,
    timezone: "America/La_Paz",
    first_business_date: null,
    ...overrides,
  };
}

const openDay = storeDay({
  id: "day-1",
  status: "open",
  opened_at: "2026-11-10T12:02:00Z",
  opened_by_user_id: "u-rosa",
  opening_cash_amount: "100.00",
});

const preview: StoreDayClosingPreview = {
  business_day_id: "day-1",
  business_date: "2026-11-10",
  status: "open",
  opening_cash_amount: "100.00",
  sales_total: "1248.50",
  sales_count: 37,
  voided_sales_count: 0,
  items_count: 64,
  cash_sales_total: "742.00",
  qr_sales_total: "318.50",
  transfer_sales_total: "120.00",
  card_sales_total: "68.00",
  cash_movements_in_total: "50.00",
  cash_movements_out_total: "30.00",
  cash_movements_count: 2,
  expected_cash_amount: "862.00",
};

function movement(overrides: Partial<CashMovement> = {}): CashMovement {
  return {
    id: "m-1",
    store_id: "s-1",
    business_day_id: "day-1",
    movement_type: "expense",
    direction: "out",
    amount: "30.00",
    note: "Pago al proveedor de pan",
    created_by_user_id: "u-rosa",
    occurred_at: "2026-11-10T13:15:00Z",
    created_at: "2026-11-10T13:15:00Z",
    voided_at: null,
    voided_by_user_id: null,
    void_reason: null,
    ...overrides,
  };
}

const lastClose: StoreDayCloseReport = {
  ...preview,
  business_day_id: "day-0",
  business_date: "2026-11-09",
  status: "closed",
  opening_cash_amount: "100.00",
  sales_total: "1310.00",
  expected_cash_amount: "905.00",
  closed_at: "2026-11-10T01:10:00Z",
  closed_by_user_id: "u-rosa",
  counted_cash_amount: "900.00",
  cash_difference_amount: "-5.00",
  closing_note: null,
  closing_snapshot_at: "2026-11-10T01:10:00Z",
};

function data(overrides: Partial<CashRegisterData> = {}): CashRegisterData {
  return {
    storeDay: storeDay(),
    preview: null,
    movements: [],
    events: [],
    lastClose,
    names: { "u-rosa": "Rosa" },
    ...overrides,
  };
}

describe("CashRegisterView", () => {
  beforeEach(() => {
    refresh.mockReset();
    push.mockReset();
    for (const action of [openStoreDayAction, closeStoreDayAction, reopenStoreDayAction, createCashMovementAction, voidCashMovementAction]) {
      vi.mocked(action).mockReset();
    }
  });

  it("closed (owner): offers to open and shows the last close", () => {
    render(<CashRegisterView role="owner" data={data()} />);

    expect(screen.getByRole("heading", { name: "Caja y jornada" })).toBeInTheDocument();
    expect(screen.getByText("Cerrada")).toBeInTheDocument();
    expect(screen.getByText("La caja está cerrada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir caja" })).toBeInTheDocument();
    expect(screen.getByText("Último cierre · 09/11/2026")).toBeInTheDocument();
    expect(screen.getByText(/Bs\s?1\.310,00/)).toBeInTheDocument();
    expect(screen.getByText(/− Bs\s?5,00/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver cierre" })).toHaveAttribute("href", "/dashboard/reports/store-days/day-0");
  });

  it("opening: quick amounts, 'same as yesterday' and the button says the amount", async () => {
    vi.mocked(openStoreDayAction).mockResolvedValue({ ok: true, message: "Caja abierta", fieldErrors: {} });
    const user = userEvent.setup();
    render(<CashRegisterView role="owner" data={data()} />);

    await user.click(screen.getByRole("button", { name: "Abrir caja" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("10/11/2026 · Bolivia (La Paz)")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /Igual que ayer/ }));
    expect(within(dialog).getByRole("button", { name: /Abrir caja con Bs\s?100,00/ })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "50" }));
    const amount = within(dialog).getByLabelText("Dinero con el que empiezas (cambio)");
    await user.clear(amount);
    await user.type(amount, "75,50");
    await user.click(within(dialog).getByRole("button", { name: /Abrir caja con Bs\s?75,50/ }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const sent = vi.mocked(openStoreDayAction).mock.calls[0][1] as FormData;
    expect(sent.get("opening_cash_amount")).toBe("75,50");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opening: API errors stay in the dialog and keep what was typed", async () => {
    vi.mocked(openStoreDayAction).mockResolvedValue({
      ok: false,
      message: "La tienda ya tiene una jornada abierta",
      fieldErrors: {},
    });
    const user = userEvent.setup();
    render(<CashRegisterView role="owner" data={data()} />);

    await user.click(screen.getByRole("button", { name: "Abrir caja" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Dinero con el que empiezas (cambio)"), "100");
    await user.click(within(dialog).getByRole("button", { name: /Abrir caja con/ }));

    expect(await within(dialog).findByText("La tienda ya tiene una jornada abierta")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Dinero con el que empiezas (cambio)")).toHaveValue("100");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("closed today: offers to reopen instead of opening", async () => {
    vi.mocked(reopenStoreDayAction).mockResolvedValue({ ok: true, message: "Jornada reabierta", fieldErrors: {} });
    const user = userEvent.setup();
    render(
      <CashRegisterView
        role="owner"
        data={data({ storeDay: storeDay({ id: "day-1", closed_at: "2026-11-11T01:10:00Z" }) })}
      />,
    );

    expect(screen.queryByRole("button", { name: "Abrir caja" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reabrir la jornada de hoy" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Se cerró a las 21:10/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Reabrir" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("open (owner): summary, movements and history", () => {
    render(
      <CashRegisterView
        role="owner"
        data={data({
          storeDay: openDay,
          preview,
          movements: [
            movement(),
            movement({ id: "m-2", movement_type: "cash_in", direction: "in", amount: "50.00", note: "Sencillo del banco" }),
            movement({
              id: "m-3",
              movement_type: "withdrawal",
              amount: "20.00",
              note: "Retiro equivocado",
              voided_at: "2026-11-10T12:40:00Z",
              void_reason: "Monto mal escrito",
            }),
          ],
          events: [
            {
              id: "e-1",
              business_day_id: "day-1",
              store_id: "s-1",
              event_type: "open",
              note: null,
              created_by_user_id: "u-rosa",
              created_at: "2026-11-10T12:02:00Z",
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("Abierta")).toBeInTheDocument();
    expect(screen.getByText(/Desde 08:02 por Rosa · Bolivia \(La Paz\)/)).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Efectivo de la caja" });
    expect(within(summary).getByText("= Debería haber")).toBeInTheDocument();
    expect(within(summary).getByText(/Bs\s?862,00/)).toBeInTheDocument();
    expect(within(summary).getByText(/QR Bs\s?318,50/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Anular" })).toHaveLength(2);
    expect(screen.getByText("Anulado")).toBeInTheDocument();
    expect(screen.getByText(/"Monto mal escrito"/)).toBeInTheDocument();
    const history = screen.getByRole("region", { name: "Historial de la jornada" });
    expect(within(history).getByText("Apertura")).toBeInTheDocument();
    expect(within(history).getByText(/· 08:02 · Rosa/)).toBeInTheDocument();
    expect(within(history).getByText(/Caja inicial Bs\s?100,00/)).toBeInTheDocument();
  });

  it("movement: in is always Entrada; out offers the four types", async () => {
    vi.mocked(createCashMovementAction).mockResolvedValue({ ok: true, message: "Movimiento registrado", fieldErrors: {} });
    const user = userEvent.setup();
    render(<CashRegisterView role="owner" data={data({ storeDay: openDay, preview })} />);

    await user.click(screen.getByRole("button", { name: "Salida o gasto" }));
    let dialog = screen.getByRole("dialog");
    for (const label of ["Gasto", "Salida", "Retiro", "Depósito al banco"]) {
      expect(within(dialog).getByRole("button", { name: label })).toBeInTheDocument();
    }
    await user.click(within(dialog).getByRole("button", { name: "Retiro" }));
    await user.type(within(dialog).getByLabelText("Monto (Bs)"), "20,5");
    await user.click(within(dialog).getByRole("button", { name: "Registrar salida" }));
    await waitFor(() => expect(createCashMovementAction).toHaveBeenCalled());
    let sent = vi.mocked(createCashMovementAction).mock.calls[0][1] as FormData;
    expect(sent.get("movement_type")).toBe("withdrawal");
    expect(sent.get("amount")).toBe("20,5");

    await user.click(screen.getByRole("button", { name: "Entrada" }));
    dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "Gasto" })).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Monto (Bs)"), "50");
    await user.click(within(dialog).getByRole("button", { name: "Registrar entrada" }));
    await waitFor(() => expect(createCashMovementAction).toHaveBeenCalledTimes(2));
    sent = vi.mocked(createCashMovementAction).mock.calls[1][1] as FormData;
    expect(sent.get("movement_type")).toBe("cash_in");
  });

  it("movement: amount errors show under the field", async () => {
    vi.mocked(createCashMovementAction).mockResolvedValue({
      ok: false,
      fieldErrors: { amount: "Monto debe ser mayor a 0" },
    });
    const user = userEvent.setup();
    render(<CashRegisterView role="owner" data={data({ storeDay: openDay, preview })} />);

    await user.click(screen.getByRole("button", { name: "Entrada" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Monto (Bs)"), "0");
    await user.click(within(dialog).getByRole("button", { name: "Registrar entrada" }));

    expect(await within(dialog).findByText("Monto debe ser mayor a 0")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Monto (Bs)")).toHaveAttribute("aria-invalid", "true");
  });

  it("closing: shows the live difference and opens the close summary", async () => {
    vi.mocked(closeStoreDayAction).mockResolvedValue({
      ok: true,
      message: "Caja cerrada",
      storeDay: { ...openDay, status: "closed", closed_at: "2026-11-11T01:10:00Z" },
      fieldErrors: {},
    });
    const user = userEvent.setup();
    render(<CashRegisterView role="owner" data={data({ storeDay: openDay, preview })} />);

    await user.click(screen.getByRole("button", { name: "Cerrar caja" }));
    const dialog = screen.getByRole("dialog");
    const counted = within(dialog).getByLabelText("Efectivo contado (Bs)");
    await user.type(counted, "860");
    expect(within(dialog).getByText(/− Bs\s?2,00 \(falta\)/)).toBeInTheDocument();
    await user.clear(counted);
    await user.type(counted, "862,00");
    expect(within(dialog).getByText("Cuadra")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("radio", { name: "Cerrar sin contar" }));
    expect(within(dialog).queryByLabelText("Efectivo contado (Bs)")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Sin conteo")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cerrar caja" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/reports/store-days/day-1"));
    const sent = vi.mocked(closeStoreDayAction).mock.calls[0][1] as FormData;
    expect(sent.get("skip_cash_count")).toBe("on");
    expect(sent.get("counted_cash_amount")).toBeNull();
  });

  it("voiding: asks for the reason and confirms what is voided", async () => {
    vi.mocked(voidCashMovementAction)
      .mockResolvedValueOnce({ ok: false, fieldErrors: { void_reason: "Escribe por qué anulas el movimiento" } })
      .mockResolvedValueOnce({ ok: true, message: "Movimiento anulado", fieldErrors: {} });
    const user = userEvent.setup();
    render(<CashRegisterView role="owner" data={data({ storeDay: openDay, preview, movements: [movement()] })} />);

    await user.click(screen.getByRole("button", { name: "Anular" }));
    const dialog = screen.getByRole("dialog", { name: /¿Anular el gasto de Bs\s?30,00\?/ });
    await user.click(within(dialog).getByRole("button", { name: "Anular movimiento" }));
    expect(await within(dialog).findByText("Escribe por qué anulas el movimiento")).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Razón"), "Se registró dos veces");
    await user.click(within(dialog).getByRole("button", { name: "Anular movimiento" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const sent = vi.mocked(voidCashMovementAction).mock.calls[1][1] as FormData;
    expect(sent.get("movement_id")).toBe("m-1");
    expect(sent.get("void_reason")).toBe("Se registró dos veces");
  });

  it("cashier: sees only if it is open, without amounts or buttons", () => {
    const { unmount } = render(<CashRegisterView role="cashier" data={data({ storeDay: openDay, preview, movements: [movement()] })} />);
    expect(screen.getByText(/La caja está abierta desde las 08:02/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ir a Vender/ })).toHaveAttribute("href", "/dashboard/pos");
    expect(screen.queryByText("= Debería haber")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar caja" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anular" })).not.toBeInTheDocument();
    unmount();

    render(<CashRegisterView role="cashier" data={data()} />);
    expect(screen.getByText("La caja está cerrada. Pídele al dueño que la abra.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abrir caja" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Último cierre/)).not.toBeInTheDocument();
  });

  it("shows load errors in place of the data that failed", () => {
    render(<CashRegisterView role="owner" data={data({ storeDay: openDay, preview: null, movements: null })} />);
    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Cerrar caja" })).toBeInTheDocument();
  });
});
