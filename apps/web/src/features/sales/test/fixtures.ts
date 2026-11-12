import type { Sale } from "../types";

export function makeSale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: "b07038f2-0000-4000-8000-000000000001",
    items: [
      { product_id: "p-1", product_name: "Coca Cola 2l", quantity: 2, unit_price: "14.00", subtotal: "28.00" },
      { product_id: "p-2", product_name: "Papas Fritas 120g", quantity: 1, unit_price: "6.50", subtotal: "6.50" },
      { product_id: "p-3", product_name: "Yogur Frutilla", quantity: 2, unit_price: "6.50", subtotal: "13.00" },
    ],
    subtotal: "47.50",
    discount_type: "product",
    discount_value: "0",
    discount_amount: "1.30",
    total: "46.20",
    payment_method: "efectivo",
    status: "completed",
    business_day_id: "day-1",
    business_date: "2026-11-10",
    created_by_user_id: "user-1",
    created_by_name: "Luis",
    customer_name: null,
    device_id: "web-pos",
    created_at: "2026-11-10T15:47:00Z",
    voided_at: null,
    void_reason: null,
    voided_by_name: null,
    ...overrides,
  };
}
