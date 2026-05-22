import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StoreDayStatusPanel, toMoneyInputValue } from "./StoreDayStatusPanel";
import type { StoreDay } from "../types";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [{ ok: false, fieldErrors: {} }, vi.fn(), false],
  };
});

vi.mock("../actions", () => ({
  openStoreDayAction: vi.fn(),
  closeStoreDayAction: vi.fn(),
  reopenStoreDayAction: vi.fn(),
  createCashMovementAction: vi.fn(),
  voidCashMovementAction: vi.fn(),
}));

describe("StoreDayStatusPanel", () => {
  it("renders closed state and owner action", () => {
    render(<StoreDayStatusPanel storeDay={closedStoreDay()} role="owner" actions="manage" />);

    expect(screen.getByText("Tienda cerrada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir tienda" })).toBeInTheDocument();
  });

  it("renders reopen action for a closed business day from today", () => {
    render(<StoreDayStatusPanel storeDay={closedStoreDay({ id: "day-1", closed_at: "2026-05-21T18:00:00Z" })} role="owner" actions="manage" />);

    expect(screen.getByRole("button", { name: "Reabrir tienda" })).toBeInTheDocument();
  });

  it("renders open state and owner close action", () => {
    render(
      <StoreDayStatusPanel
        storeDay={openStoreDay()}
        role="owner"
        actions="manage"
        cashMovements={{
          ok: true,
          data: {
            items: [
              {
                id: "movement-1",
                store_id: "store-1",
                business_day_id: "day-1",
                movement_type: "expense",
                direction: "out",
                amount: "25.00",
                note: "Bolsas",
                created_by_user_id: "user-1",
                occurred_at: "2026-05-22T14:00:00Z",
                created_at: "2026-05-22T14:00:00Z",
                voided_at: null,
                voided_by_user_id: null,
                void_reason: null,
              },
            ],
            total: 1,
            limit: 50,
            offset: 0,
          },
        }}
      />,
    );

    expect(screen.getByText("Tienda abierta")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Cerrar sin conteo de efectivo" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Efectivo contado" })).toBeRequired();
    expect(screen.getByRole("button", { name: "Cerrar tienda" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Tipo de movimiento" })).toHaveValue("expense");
    expect(screen.getByRole("textbox", { name: "Monto de movimiento" })).toBeRequired();
    expect(screen.getByRole("textbox", { name: "Monto de movimiento" })).toHaveAttribute(
      "pattern",
      "\\d+(\\.\\d{1,2})?",
    );
    expect(screen.getByText("Bolsas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anular" })).toBeInTheDocument();
  });

  it("filters cash movement amount input to numbers and two decimals", () => {
    render(<StoreDayStatusPanel storeDay={openStoreDay()} role="owner" actions="manage" />);

    const amount = screen.getByRole("textbox", { name: "Monto de movimiento" });
    fireEvent.input(amount, { target: { value: "abc12.345x.67" } });

    expect(amount).toHaveValue("12.34");
  });

  it("renders management link without inline actions", () => {
    render(<StoreDayStatusPanel storeDay={openStoreDay()} role="owner" actions="link" />);

    expect(screen.getByRole("link", { name: "Gestionar jornada" })).toHaveAttribute("href", "/dashboard/settings");
    expect(screen.queryByRole("button", { name: "Cerrar tienda" })).not.toBeInTheDocument();
  });

  it("hides actions for cashier", () => {
    render(<StoreDayStatusPanel storeDay={openStoreDay()} role="cashier" actions="manage" />);

    expect(screen.getByText("Tienda abierta")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar tienda" })).not.toBeInTheDocument();
  });
});

describe("toMoneyInputValue", () => {
  it("keeps only digits and up to two decimal places", () => {
    expect(toMoneyInputValue("abc12.345x.67")).toBe("12.34");
    expect(toMoneyInputValue("100")).toBe("100");
    expect(toMoneyInputValue("10.5")).toBe("10.5");
  });
});

function closedStoreDay(overrides: Partial<StoreDay> = {}): StoreDay {
  return {
    id: null,
    status: "closed",
    business_date: "2026-05-21",
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

function openStoreDay(): StoreDay {
  return {
    ...closedStoreDay(),
    id: "day-1",
    status: "open",
    opened_at: "2026-05-21T12:00:00Z",
    opened_by_user_id: "user-1",
    first_business_date: "2026-05-21",
  };
}
