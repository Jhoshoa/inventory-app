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

import { updateStoreAction, updateStorefrontAction } from "./actions";
import type { StoreEditorState, StorefrontState } from "./types";

const initialState: StoreEditorState = { ok: false, message: "", fieldErrors: {} };
const initialStorefrontState: StorefrontState = { ok: false, message: "", fieldErrors: {} };

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

describe("updateStorefrontAction", () => {
  beforeEach(() => {
    apiRequest.mockReset();
    getAuthToken.mockReset();
    revalidatePath.mockReset();
    getAuthToken.mockResolvedValue("token");
  });

  it("rejects activating the storefront without a slug", async () => {
    const formData = buildFormData({ storefront_enabled: "on", storefront_slug: "" });

    const result = await updateStorefrontAction(initialStorefrontState, formData);

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.slug).toBeTruthy();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("rejects an invalid slug format", async () => {
    const formData = buildFormData({ storefront_slug: "Mi Tienda!" });

    const result = await updateStorefrontAction(initialStorefrontState, formData);

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.slug).toBeTruthy();
  });

  it("rejects a non-hex color", async () => {
    const formData = buildFormData({ storefront_color_primary: "blue" });

    const result = await updateStorefrontAction(initialStorefrontState, formData);

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.colorPrimary).toBeTruthy();
  });

  it("sends the slug only when provided, but always sends the other optional fields", async () => {
    apiRequest.mockResolvedValue({ ok: true, data: { id: "store-1" } });

    const formData = buildFormData({
      storefront_enabled: "on",
      storefront_slug: "mi-tienda",
      storefront_logo_url: "",
      storefront_color_primary: "#2563EB",
    });

    const result = await updateStorefrontAction(initialStorefrontState, formData);

    expect(result.ok).toBe(true);
    const [, options] = apiRequest.mock.calls[0];
    expect(options.body).toEqual({
      storefront_enabled: true,
      storefront_slug: "mi-tienda",
      storefront_logo_url: "",
      storefront_banner_url: "",
      storefront_color_primary: "#2563EB",
      storefront_color_secondary: "",
      storefront_description: "",
      storefront_whatsapp: "",
      storefront_payment_instructions: "",
    });
  });

  it("omits the slug key entirely when left blank on a disable-only save", async () => {
    apiRequest.mockResolvedValue({ ok: true, data: { id: "store-1" } });

    const formData = buildFormData({ storefront_enabled: "" });

    await updateStorefrontAction(initialStorefrontState, formData);

    const [, options] = apiRequest.mock.calls[0];
    expect(options.body).not.toHaveProperty("storefront_slug");
    expect(options.body.storefront_enabled).toBe(false);
  });
});
