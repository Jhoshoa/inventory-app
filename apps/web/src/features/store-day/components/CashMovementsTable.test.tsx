import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CashMovementsTable, cashMovementLabel } from "./CashMovementsTable";
import type { CashMovement } from "../types";

describe("CashMovementsTable", () => {
  it("renders movement rows with signed totals", () => {
    render(
      <CashMovementsTable
        items={[
          movement({ id: "in-1", movement_type: "cash_in", direction: "in", amount: "50.00", note: "Cambio" }),
          movement({ id: "out-1", movement_type: "expense", direction: "out", amount: "12.50", note: "Bolsas" }),
        ]}
      />,
    );

    expect(screen.getByText("Entrada")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("+Bs") && content.includes("50"))).toBeInTheDocument();
    expect(screen.getByText("Gasto")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("-Bs") && content.includes("12"))).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(<CashMovementsTable items={[]} />);

    expect(screen.getByText("Sin movimientos")).toBeInTheDocument();
  });
});

describe("cashMovementLabel", () => {
  it("returns friendly labels", () => {
    expect(cashMovementLabel("withdrawal")).toBe("Retiro");
    expect(cashMovementLabel("unknown")).toBe("unknown");
  });
});

function movement(overrides: Partial<CashMovement>): CashMovement {
  return {
    id: "movement-1",
    store_id: "store-1",
    business_day_id: "day-1",
    movement_type: "expense",
    direction: "out",
    amount: "10.00",
    note: null,
    created_by_user_id: "user-1",
    occurred_at: "2026-05-22T14:00:00Z",
    created_at: "2026-05-22T14:00:00Z",
    voided_at: null,
    voided_by_user_id: null,
    void_reason: null,
    ...overrides,
  };
}
