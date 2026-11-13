import type { StorefrontRequestListResponse, StorefrontRequestResponse } from "../types";

export function makeRequest(overrides: Partial<StorefrontRequestResponse> = {}): StorefrontRequestResponse {
  return {
    id: "req-1",
    product_id: null,
    product_name: "Coca Cola 2l",
    customer_name: "María Choque",
    customer_phone: "59170011122",
    note: "Calle 21 de Calacoto, casa verde",
    status: "pending",
    payment_confirmed: false,
    created_at: "2026-11-12T15:22:00Z",
    items: [
      { product_id: "p-1", product_name: "Coca Cola 2l", unit: "unidad", quantity: 2, unit_price: "14.00", line_total: "28.00" },
      { product_id: "p-2", product_name: "Pan de batalla", unit: "unidad", quantity: 20, unit_price: "0.50", line_total: "10.00" },
      { product_id: "p-3", product_name: "Aceite Fino 1l", unit: "unidad", quantity: 1, unit_price: "18.00", line_total: "18.00" },
    ],
    total: "56.00",
    delivery_method: "delivery",
    ...overrides,
  };
}

export function makeList(items = [makeRequest()], overrides: Partial<StorefrontRequestListResponse> = {}): StorefrontRequestListResponse {
  return {
    items,
    total: items.length,
    pending_count: 2,
    status_counts: { pending: 2, contacted: 3, closed: 7 },
    limit: 50,
    offset: 0,
    ...overrides,
  };
}
