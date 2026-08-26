import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const getAuthToken = vi.fn();
const revalidatePath = vi.fn();
const cookiesGet = vi.fn();
const cookiesSet = vi.fn();

vi.mock("@/lib/api/client", () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthToken: () => getAuthToken(),
  SESSION_COOKIE: "session",
  serializeSession: (user: unknown) => JSON.stringify(user),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (...args: unknown[]) => cookiesGet(...args),
    set: (...args: unknown[]) => cookiesSet(...args),
  }),
}));

import { updateStoreAction } from "./actions";
import type { StoreEditorState } from "./types";

const initialState: StoreEditorState = { ok: false, message: "", fieldErrors: {} };

function buildFormData(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) formData.set(key, value);
  return formData;
}

describe("updateStoreAction", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    getAuthToken.mockReset();
    revalidatePath.mockReset();
    cookiesGet.mockReset();
    cookiesSet.mockReset();
    getAuthToken.mockResolvedValue("token");
    cookiesGet.mockReturnValue(undefined);
  });

  it("sends address and phone as empty strings so an existing value can be cleared", async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      data: { id: "store-1", name: "Tienda", address: null, phone: null },
    });

    const formData = buildFormData({ name: "Tienda", address: "", phone: "" });

    const result = await updateStoreAction(initialState, formData);

    expect(result.ok).toBe(true);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    const [, options] = apiRequest.mock.calls[0];
    expect(options.body).toEqual({ name: "Tienda", address: "", phone: "" });
  });

  it("still sends a provided address and phone", async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      data: { id: "store-1", name: "Tienda", address: "Calle 1", phone: "123" },
    });

    const formData = buildFormData({ name: "Tienda", address: "Calle 1", phone: "123" });

    await updateStoreAction(initialState, formData);

    const [, options] = apiRequest.mock.calls[0];
    expect(options.body).toEqual({ name: "Tienda", address: "Calle 1", phone: "123" });
  });
});
