import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

import { createStorefrontOrderAction } from "./requestActions";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const CUSTOMER = { customer_name: "Ana Rojas", customer_phone: "59171234567" };

describe("createStorefrontOrderAction", () => {
  beforeEach(() => apiRequest.mockReset());

  it("posts the lines and the delivery method as separate fields", async () => {
    apiRequest.mockResolvedValue({ ok: true, data: { id: "o-1", items: [], total: "0", delivery_method: "delivery" } });

    const result = await createStorefrontOrderAction(
      "mi tienda",
      [{ product_id: "p-1", quantity: 2 }],
      form({ ...CUSTOMER, delivery: "delivery", note: "  Av. Arce 456  " }),
    );

    expect(result.ok).toBe(true);
    const [url, options] = apiRequest.mock.calls[0];
    expect(url).toBe("/public/storefront/mi%20tienda/orders");
    expect(options.body).toEqual({
      customer_name: "Ana Rojas",
      customer_phone: "59171234567",
      note: "Av. Arce 456",
      delivery_method: "delivery",
      items: [{ product_id: "p-1", quantity: 2 }],
    });
  });

  it("returns the unavailable product ids from a 409", async () => {
    apiRequest.mockResolvedValue({
      ok: false,
      error: {
        status: 409,
        message: "Algunos productos de tu pedido ya no están disponibles.",
        details: { error: "conflict", unavailable_product_ids: ["p-2"] },
      },
    });

    const result = await createStorefrontOrderAction("tienda", [{ product_id: "p-2", quantity: 1 }], form(CUSTOMER));

    expect(result).toMatchObject({ ok: false, unavailableProductIds: ["p-2"] });
  });

  it("validates the customer before calling the API", async () => {
    const result = await createStorefrontOrderAction("tienda", [], form({ customer_name: "", customer_phone: "abc" }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual(["customerName", "customerPhone", "items"]);
    }
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
