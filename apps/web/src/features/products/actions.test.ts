import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const getAuthToken = vi.fn();
const revalidatePath = vi.fn();
const redirect = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthToken: () => getAuthToken(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirect(...args),
}));

vi.mock("@/features/storefront/revalidate", () => ({ revalidateStorefrontCatalog: vi.fn() }));

import { createProductAction, updateProductAction } from "./actions";
import { formDataToProductValues } from "./schemas";
import type { ProductActionState } from "./types";

const initialState: ProductActionState = { ok: false, fieldErrors: {} };

function buildFormData(values: Partial<Record<string, string>>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) formData.set(key, value);
  }
  return formData;
}

describe("createProductAction", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    getAuthToken.mockReset();
    revalidatePath.mockReset();
    redirect.mockReset();
    getAuthToken.mockResolvedValue("token");
  });

  it("defaults min_stock to 1 (matching the backend default), not 5, when left blank", async () => {
    apiRequest.mockResolvedValue({ ok: false, error: { message: "boom" } });

    const formData = buildFormData({
      name: "Producto de prueba",
      price: "10",
      stock: "5",
      min_stock: "",
    });

    await createProductAction(initialState, formData);

    expect(apiRequest).toHaveBeenCalledTimes(1);
    const [, options] = apiRequest.mock.calls[0];
    expect((options.body as { min_stock: number }).min_stock).toBe(1);
  });

  it("passes through an explicit min_stock value", async () => {
    apiRequest.mockResolvedValue({ ok: false, error: { message: "boom" } });

    const formData = buildFormData({
      name: "Producto de prueba",
      price: "10",
      stock: "5",
      min_stock: "3",
    });

    await createProductAction(initialState, formData);

    const [, options] = apiRequest.mock.calls[0];
    expect((options.body as { min_stock: number }).min_stock).toBe(3);
  });
});

describe("createProductAction · P02", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    getAuthToken.mockReset();
    redirect.mockReset();
    getAuthToken.mockResolvedValue("token");
  });

  it("sends amounts written with comma as dot", async () => {
    apiRequest.mockResolvedValue({ ok: false, error: { status: 500, message: "boom" } });
    await createProductAction(
      initialState,
      buildFormData({ name: "Leche", price: "7,50", cost_price: "5,2", stock: "3", discount_type: "fixed", discount_value: "0,50" }),
    );
    const body = apiRequest.mock.calls[0][1].body as Record<string, unknown>;
    expect(body.price).toBe("7.50");
    expect(body.cost_price).toBe("5.2");
    expect(body.discount_value).toBe("0.50");
  });

  it("shows a repeated scan code on its field and keeps what was written", async () => {
    apiRequest.mockResolvedValue({ ok: false, error: { status: 409, message: "El codigo escaneable ya esta en uso por otro producto" } });
    const state = await createProductAction(initialState, buildFormData({ name: "Leche", price: "7", stock: "3", qr_code: "775" }));
    expect(state.fieldErrors.qr_code).toMatch(/en uso/);
    expect(state.message).toBeUndefined();
    expect(state.values?.qr_code).toBe("775");
  });

  it("saves Dónde está right after creating and opens the product", async () => {
    apiRequest
      .mockResolvedValueOnce({ ok: true, data: { id: "p-9" } })
      .mockResolvedValueOnce({ ok: true, data: [] });
    await createProductAction(
      initialState,
      buildFormData({
        name: "Leche",
        price: "7",
        stock: "3",
        locations: JSON.stringify([{ location_id: "l-1", kind: "display" }, { location_id: 5, kind: "x" }]),
      }),
    );
    expect(apiRequest.mock.calls[1][0]).toBe("/products/p-9/locations");
    expect(apiRequest.mock.calls[1][1].body).toEqual({ items: [{ location_id: "l-1", kind: "display" }] });
    expect(redirect).toHaveBeenCalledWith("/dashboard/products/p-9?creado=1");
  });

  it("warns on the product page when Dónde está could not be saved", async () => {
    apiRequest
      .mockResolvedValueOnce({ ok: true, data: { id: "p-9" } })
      .mockResolvedValueOnce({ ok: false, error: { status: 500, message: "x" } });
    await createProductAction(
      initialState,
      buildFormData({ name: "Leche", price: "7", stock: "3", locations: JSON.stringify([{ location_id: "l-1", kind: "display" }]) }),
    );
    expect(redirect).toHaveBeenCalledWith("/dashboard/products/p-9?creado=1&lugares_error=1");
  });
});

describe("updateProductAction", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    getAuthToken.mockReset();
    revalidatePath.mockReset();
    redirect.mockReset();
    getAuthToken.mockResolvedValue("token");
  });

  it("defaults min_stock to 1, not 5, when left blank", async () => {
    apiRequest.mockResolvedValue({ ok: false, error: { message: "boom" } });

    const formData = buildFormData({
      product_id: "prod-1",
      name: "Producto de prueba",
      price: "10",
      min_stock: "",
    });

    await updateProductAction(initialState, formData);

    const [, options] = apiRequest.mock.calls[0];
    expect((options.body as { min_stock: number }).min_stock).toBe(1);
  });
});

describe("formDataToProductValues", () => {
  it("keeps an explicit zero for numeric fields instead of dropping it", () => {
    const formData = buildFormData({ min_stock: "0", stock: "0" });
    const values = formDataToProductValues(formData);
    expect(values.min_stock).toBe("0");
    expect(values.stock).toBe("0");
  });
});
