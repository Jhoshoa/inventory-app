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
