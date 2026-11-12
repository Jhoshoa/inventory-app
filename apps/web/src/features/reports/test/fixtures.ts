import type { StoreDayCloseReport } from "@/features/store-day/types";
import type { SalesReport } from "../types";

export function makeReport(overrides: Partial<SalesReport> = {}): SalesReport {
  return {
    from_date: "2026-11-04",
    to_date: "2026-11-10",
    first_business_date: "2026-10-01",
    total_sales: "8412.00",
    sales_count: 241,
    items_count: 512,
    by_payment_method: [
      { payment_method: "qr", total: "2480.00", count: 70 },
      { payment_method: "efectivo", total: "5020.00", count: 150 },
      { payment_method: "tarjeta", total: "0.00", count: 0 },
    ],
    top_products: Array.from({ length: 7 }, (_, index) => ({
      product_id: `p-${index}`,
      product_name: index === 0 ? "Pan de batalla" : `Producto ${index}`,
      quantity: 420 - index * 10,
      total: "210.00",
    })),
    ...overrides,
  };
}

export function makeClosing(overrides: Partial<StoreDayCloseReport> = {}): StoreDayCloseReport {
  return {
    business_day_id: "day-1",
    business_date: "2026-11-09",
    status: "closed",
    opening_cash_amount: "100.00",
    sales_total: "1310.00",
    sales_count: 38,
    voided_sales_count: 1,
    items_count: 91,
    cash_sales_total: "830.00",
    qr_sales_total: "300.00",
    transfer_sales_total: "100.00",
    card_sales_total: "80.00",
    cash_movements_in_total: "20.00",
    cash_movements_out_total: "45.00",
    cash_movements_count: 2,
    expected_cash_amount: "905.00",
    opened_at: "2026-11-09T12:00:00Z",
    closed_at: "2026-11-10T01:10:00Z",
    closed_by_user_id: "u-1",
    counted_cash_amount: "900.00",
    cash_difference_amount: "-5.00",
    closing_note: "Faltó cambio",
    closing_snapshot_at: "2026-11-10T01:10:00Z",
    ...overrides,
  };
}
