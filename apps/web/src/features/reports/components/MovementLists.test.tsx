import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CashMovement } from "@/features/store-day/types";
import type { StockMovement } from "../types";
import { CashMovementList } from "./CashMovementList";
import { StockMovementList } from "./StockMovementList";

const stock = (overrides: Partial<StockMovement>): StockMovement => ({
  id: "m-1",
  product_id: "p-1",
  sale_id: null,
  movement_type: "sale",
  quantity_delta: -1,
  stock_after: 10,
  reason: null,
  device_id: null,
  created_at: "2026-11-10T05:04:00Z",
  product_name: "Yogur Frutilla",
  ...overrides,
});

describe("movement lists", () => {
  it("shows stock changes with product, reason and result", () => {
    render(
      <StockMovementList
        today="2026-11-10"
        movements={[
          stock({}),
          stock({ id: "m-2", movement_type: "manual_adjustment", reason: "Envase roto", quantity_delta: -2, stock_after: 11 }),
          stock({ id: "m-3", movement_type: "sale_void", quantity_delta: 1, stock_after: 11, product_name: null }),
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/Yogur Frutilla.*Hoy 01:04 · Venta.*−1 → 10/);
    expect(items[1]).toHaveTextContent(/Envase roto.*−2 → 11/);
    expect(items[2]).toHaveTextContent(/Producto borrado.*Anulación.*\+1 → 11/);
    expect(screen.getAllByRole("link")[0]).toHaveAttribute("href", "/dashboard/products/p-1");
  });

  it("shows cash movements with who, and voided ones struck with their reason", () => {
    const movement: CashMovement = {
      id: "c-1",
      store_id: "s",
      business_day_id: "d",
      movement_type: "expense",
      direction: "out",
      amount: "45.00",
      note: "Bolsas",
      created_by_user_id: "u-1",
      occurred_at: "2026-11-10T14:00:00Z",
      created_at: "2026-11-10T14:00:00Z",
      voided_at: null,
      voided_by_user_id: null,
      void_reason: null,
    };
    render(
      <CashMovementList
        today="2026-11-10"
        names={{ "u-1": "Rosa" }}
        movements={[
          movement,
          { ...movement, id: "c-2", movement_type: "cash_in", direction: "in", amount: "20.00", note: null, voided_at: "2026-11-10T15:00:00Z", void_reason: "Duplicado" },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent(/Gasto · Bolsas.*Hoy 10:00 · Rosa.*− Bs\s?45,00/);
    expect(items[1]).toHaveTextContent(/Entrada.*Anulado · Duplicado.*\+ Bs\s?20,00/);
  });
});
