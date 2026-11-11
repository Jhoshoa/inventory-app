import { describe, expect, it } from "vitest";
import type { StoreDay } from "../types";
import {
  cashDifference,
  isClosedToday,
  movementTypeLabel,
  movementWithArticle,
  personName,
  timezoneLabel,
} from "./cashRegister";

function createClosedStoreDay(): StoreDay {
  return {
    id: null,
    status: "closed",
    business_date: "2026-11-11",
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
  };
}

describe("cashRegister helpers", () => {
  it("names the Bolivian timezone", () => {
    expect(timezoneLabel("America/La_Paz")).toBe("Bolivia (La Paz)");
    expect(timezoneLabel("America/Sao_Paulo")).toBe("America/Sao Paulo");
    expect(timezoneLabel(null)).toBe("");
  });

  it("labels movement types with their article", () => {
    expect(movementTypeLabel("deposit")).toBe("Depósito al banco");
    expect(movementWithArticle("expense")).toBe("el gasto");
    expect(movementWithArticle("cash_out")).toBe("la salida");
    expect(movementWithArticle("cash_in")).toBe("la entrada");
    expect(movementTypeLabel("otro")).toBe("otro");
  });

  it("computes the difference in cents", () => {
    expect(cashDifference("860", "862.00")).toEqual({ cents: -200, amount: "2.00", kind: "short" });
    expect(cashDifference("862,00", "862.00")).toEqual({ cents: 0, amount: "0.00", kind: "even" });
    expect(cashDifference("870,10", "862.00")).toEqual({ cents: 810, amount: "8.10", kind: "over" });
    expect(cashDifference("0,1", "0.2")).toEqual({ cents: -10, amount: "0.10", kind: "short" });
    expect(cashDifference("", "862.00")).toBeNull();
    expect(cashDifference("1.234,50", "862.00")).toBeNull();
    expect(cashDifference("10", null)).toBeNull();
  });

  it("knows when today was already closed", () => {
    const closed = createClosedStoreDay();
    expect(isClosedToday(closed)).toBe(false);
    expect(isClosedToday({ ...closed, id: "day-1", closed_at: "2026-11-11T21:10:00Z" })).toBe(true);
    expect(isClosedToday({ ...closed, id: "day-1", status: "open", closed_at: null })).toBe(false);
  });

  it("resolves names only when known", () => {
    expect(personName({ u1: "Rosa" }, "u1")).toBe("Rosa");
    expect(personName({ u1: "Rosa" }, "u2")).toBeNull();
    expect(personName({}, null)).toBeNull();
  });
});
