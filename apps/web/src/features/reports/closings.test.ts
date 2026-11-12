import { describe, expect, it } from "vitest";
import { closingDay, closingDifference, closingHours, nonCashSales } from "./closings";

describe("closings", () => {
  it("tells even, short, over and uncounted apart", () => {
    expect(closingDifference({ counted_cash_amount: "512.00", cash_difference_amount: "0.00" })).toEqual({ kind: "even", amount: 0 });
    expect(closingDifference({ counted_cash_amount: "900.00", cash_difference_amount: "-5.00" })).toEqual({ kind: "short", amount: 5 });
    expect(closingDifference({ counted_cash_amount: "903.50", cash_difference_amount: "3.50" })).toEqual({ kind: "over", amount: 3.5 });
    expect(closingDifference({ counted_cash_amount: null, cash_difference_amount: null })).toEqual({ kind: "uncounted", amount: 0 });
  });

  it("names the day and the hours in Bolivia time", () => {
    expect(closingDay("2026-11-09")).toBe("Lun 09/11");
    expect(closingDay("2026-11-09", true)).toBe("Lunes 09/11");
    expect(closingHours({ opened_at: "2026-11-09T12:00:00Z", closed_at: "2026-11-10T01:10:00Z" })).toBe("08:00–21:10");
    expect(closingHours({ opened_at: null, closed_at: "2026-11-10T01:10:00Z" })).toBe("cerró 21:10");
    expect(closingHours({ opened_at: "2026-11-11T20:20:00Z", closed_at: "2026-11-12T20:39:00Z" })).toBe("16:20 – 12/11 16:39");
  });

  it("adds what did not go into the cash drawer", () => {
    expect(nonCashSales({ qr_sales_total: "300.00", transfer_sales_total: "100.00", card_sales_total: "80.00" })).toBe(480);
  });
});
