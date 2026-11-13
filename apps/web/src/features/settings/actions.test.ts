import { beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
const getAuthToken = vi.fn();
const revalidatePath = vi.fn();
const revalidateTag = vi.fn();
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
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
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
      data: { id: "store-1", name: "Tienda", address: "Calle 1", phone: "59170012345" },
    });

    const formData = buildFormData({ name: "Tienda", address: "Calle 1", phone: "59170012345" });

    await updateStoreAction(initialState, formData);

    const [, options] = apiRequest.mock.calls[0];
    expect(options.body).toEqual({ name: "Tienda", address: "Calle 1", phone: "59170012345" });
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
    apiRequest.mockResolvedValue({ ok: true, data: { id: "store-1", storefront_slug: "mi-tienda" } });

    const formData = buildFormData({
      storefront_enabled: "on",
      storefront_slug: "mi-tienda",
      storefront_color_primary: "#2563EB",
      storefront_whatsapp: "59170000000",
    });

    const result = await updateStorefrontAction(initialStorefrontState, formData);

    expect(result.ok).toBe(true);
    expect(revalidateTag).toHaveBeenCalledWith("storefront:mi-tienda");
    const [, options] = apiRequest.mock.calls[0];
    expect(options.body).toEqual({
      storefront_enabled: true,
      storefront_slug: "mi-tienda",
      storefront_color_primary: "#2563EB",
      storefront_color_secondary: "",
      storefront_description: "",
      storefront_whatsapp: "59170000000",
      storefront_payment_instructions: "",
      storefront_settings: expect.objectContaining({ hours: null, announcement_enabled: false }),
    });
  });

  it("sends the catalog settings read from the form", async () => {
    apiRequest.mockResolvedValue({ ok: true, data: { id: "store-1", storefront_slug: "mi-tienda" } });

    const formData = buildFormData({
      storefront_slug: "mi-tienda",
      settings_template: "lista",
      settings_announcement_enabled: "on",
      settings_announcement_text: "  Envios gratis  ",
      settings_show_featured: "on",
      settings_stock_display: "out_of_stock",
      settings_default_sort: "popular",
      settings_delivery_enabled: "on",
      settings_instagram: "@mitienda",
      settings_hours_enabled: "on",
      hours_0_open: "on",
      hours_0_opens_at: "08:00",
      hours_0_closes_at: "20:00",
    });
    formData.append("settings_featured_product_ids", "p-2");
    formData.append("settings_featured_product_ids", "p-1");

    const result = await updateStorefrontAction(initialStorefrontState, formData);

    expect(result.ok).toBe(true);
    const [, options] = apiRequest.mock.calls[0];
    const settings = options.body.storefront_settings;
    expect(settings).toMatchObject({
      template: "lista",
      announcement_enabled: true,
      announcement_text: "Envios gratis",
      show_featured: true,
      show_payment: false,
      stock_display: "out_of_stock",
      default_sort: "popular",
      pickup_enabled: false,
      delivery_enabled: true,
      instagram: "@mitienda",
      facebook: null,
      featured_product_ids: ["p-2", "p-1"],
    });
    expect(settings.hours).toHaveLength(7);
    expect(settings.hours[0]).toEqual({ is_open: true, opens_at: "08:00", closes_at: "20:00" });
    expect(settings.hours[1]).toEqual({ is_open: false, opens_at: null, closes_at: null });
  });

  it("rejects an open day without hours and a cinta without text before calling the API", async () => {
    const formData = buildFormData({
      settings_announcement_enabled: "on",
      settings_hours_enabled: "on",
      hours_2_open: "on",
      hours_2_opens_at: "08:00",
      settings_maps_url: "https://example.com/mapa",
    });

    const result = await updateStorefrontAction(initialStorefrontState, formData);

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.announcementText).toBeTruthy();
    expect(result.fieldErrors["hours.2"]).toMatch(/^Miercoles/);
    expect(result.fieldErrors.mapsUrl).toBeTruthy();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("shows the backend validation message next to the social field it belongs to", async () => {
    apiRequest.mockResolvedValue({
      ok: false,
      error: {
        status: 422,
        message: "validation_error",
        details: {
          error: "validation_error",
          detail: [
            {
              loc: ["body", "storefront_settings", "instagram"],
              msg: "Value error, Escribe tu usuario de Instagram, ej. @mitienda",
            },
          ],
        },
      },
    });

    const result = await updateStorefrontAction(
      initialStorefrontState,
      buildFormData({ settings_instagram: "https://evil.example.com" }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.instagram).toBe("Escribe tu usuario de Instagram, ej. @mitienda");
  });

  it.each([
    ["7000abc0", "El teléfono solo puede tener números"],
    ["5917000000", "Un número de Bolivia tiene 8 dígitos, ej. 70012345"],
  ])("rejects the WhatsApp number %s", async (whatsapp, message) => {
    const formData = buildFormData({ storefront_whatsapp: whatsapp });

    const result = await updateStorefrontAction(initialStorefrontState, formData);

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.whatsapp).toBe(message);
    expect(apiRequest).not.toHaveBeenCalled();
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
