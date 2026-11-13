import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOfflineDb } from "./db";
import {
  computeEffectivePrice,
  discardPendingSale,
  flushPendingSales,
  isDiscountExpired,
  listConflictedSales,
  pullCatalog,
  queueSale,
  retryPendingSale,
} from "./syncEngine";

beforeEach(async () => {
  const db = getOfflineDb();
  await db.products.clear();
  await db.pendingSales.clear();
  await db.meta.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("queueSale", () => {
  it("stores a pending sale and decrements local stock optimistically", async () => {
    const db = getOfflineDb();
    await db.products.put({
      id: "product-1",
      name: "Arroz 1kg",
      price: "12.50",
      stock: 5,
      unit: "unidad",
      qr_code: null,
      discount_type: null,
      discount_value: "0",
      effective_price: "12.50",
      deleted: false,
      serverUpdatedAt: new Date().toISOString(),
    });

    const sale = await queueSale({
      items: [{ product_id: "product-1", product_name: "Arroz 1kg", quantity: 2, unit_price: "12.50" }],
      paymentMethod: "efectivo",
      customerName: null,
      discountType: null,
      discountValue: "0",
      discountSourceOverride: null,
      totalEstimate: "25.00",
    });

    expect(sale.status).toBe("pending");
    const stored = await db.pendingSales.get(sale.id);
    expect(stored?.status).toBe("pending");
    const product = await db.products.get("product-1");
    expect(product?.stock).toBe(3);
  });

  it("never lets local stock go below zero", async () => {
    const db = getOfflineDb();
    await db.products.put({
      id: "product-2",
      name: "Aceite",
      price: "20.00",
      stock: 1,
      unit: "unidad",
      qr_code: null,
      discount_type: null,
      discount_value: "0",
      effective_price: "20.00",
      deleted: false,
      serverUpdatedAt: new Date().toISOString(),
    });

    await queueSale({
      items: [{ product_id: "product-2", product_name: "Aceite", quantity: 5, unit_price: "20.00" }],
      paymentMethod: "efectivo",
      customerName: null,
      discountType: null,
      discountValue: "0",
      discountSourceOverride: null,
      totalEstimate: "100.00",
    });

    const product = await db.products.get("product-2");
    expect(product?.stock).toBe(0);
  });
});

describe("flushPendingSales", () => {
  it("marks accepted sales as synced", async () => {
    const db = getOfflineDb();
    const sale = await queueSale({
      items: [{ product_id: "product-1", product_name: "Arroz", quantity: 1, unit_price: "10.00" }],
      paymentMethod: "efectivo",
      customerName: null,
      discountType: null,
      discountValue: "0",
      discountSourceOverride: null,
      totalEstimate: "10.00",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              client_change_id: sale.id,
              entity: "sale",
              operation: "create",
              entity_id: sale.id,
              status: "accepted",
              server_version: 1,
              server_updated_at: new Date().toISOString(),
              error: null,
            },
          ],
          server_time: new Date().toISOString(),
        }),
      }),
    );

    const result = await flushPendingSales();
    expect(result.synced).toBe(1);
    const stored = await db.pendingSales.get(sale.id);
    expect(stored?.status).toBe("synced");
  });

  it("two syncs at the same time send once and the sale stays synced", async () => {
    const db = getOfflineDb();
    const sale = await queueSale({
      items: [{ product_id: "product-1", product_name: "Arroz", quantity: 1, unit_price: "10.00" }],
      paymentMethod: "efectivo",
      customerName: null,
      discountType: null,
      discountValue: "0",
      discountSourceOverride: null,
      totalEstimate: "10.00",
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            client_change_id: sale.id,
            entity: "sale",
            operation: "create",
            entity_id: sale.id,
            status: "accepted",
            server_version: 1,
            server_updated_at: new Date().toISOString(),
            error: null,
          },
        ],
        server_time: new Date().toISOString(),
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([flushPendingSales(), flushPendingSales()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect((await db.pendingSales.get(sale.id))?.status).toBe("synced");
  });

  it("marks conflicting sales for manual review without discarding them", async () => {
    const db = getOfflineDb();
    const sale = await queueSale({
      items: [{ product_id: "product-1", product_name: "Arroz", quantity: 10, unit_price: "10.00" }],
      paymentMethod: "efectivo",
      customerName: null,
      discountType: null,
      discountValue: "0",
      discountSourceOverride: null,
      totalEstimate: "100.00",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              client_change_id: sale.id,
              entity: "sale",
              operation: "create",
              entity_id: sale.id,
              status: "conflict",
              server_version: null,
              server_updated_at: null,
              error: { code: "conflict", detail: "Stock insuficiente para Arroz: 2 < 10" },
            },
          ],
          server_time: new Date().toISOString(),
        }),
      }),
    );

    const result = await flushPendingSales();
    expect(result.conflicts).toBe(1);
    const stored = await db.pendingSales.get(sale.id);
    expect(stored?.status).toBe("conflict");
    expect(stored?.errorMessage).toContain("Stock insuficiente");
  });

  it("reverts to pending (not lost) when the network request fails", async () => {
    const db = getOfflineDb();
    const sale = await queueSale({
      items: [{ product_id: "product-1", product_name: "Arroz", quantity: 1, unit_price: "10.00" }],
      paymentMethod: "efectivo",
      customerName: null,
      discountType: null,
      discountValue: "0",
      discountSourceOverride: null,
      totalEstimate: "10.00",
    });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await flushPendingSales();
    expect(result.synced).toBe(0);
    const stored = await db.pendingSales.get(sale.id);
    expect(stored?.status).toBe("pending");
  });
});

describe("discardPendingSale", () => {
  it("restores the local stock that was optimistically reserved", async () => {
    const db = getOfflineDb();
    await db.products.put({
      id: "product-1",
      name: "Arroz",
      price: "10.00",
      stock: 5,
      unit: "unidad",
      qr_code: null,
      discount_type: null,
      discount_value: "0",
      effective_price: "10.00",
      deleted: false,
      serverUpdatedAt: new Date().toISOString(),
    });

    const sale = await queueSale({
      items: [{ product_id: "product-1", product_name: "Arroz", quantity: 3, unit_price: "10.00" }],
      paymentMethod: "efectivo",
      customerName: null,
      discountType: null,
      discountValue: "0",
      discountSourceOverride: null,
      totalEstimate: "30.00",
    });
    expect((await db.products.get("product-1"))?.stock).toBe(2);

    await db.pendingSales.update(sale.id, { status: "conflict", errorMessage: "Stock insuficiente" });
    await discardPendingSale(sale.id);

    expect(await db.pendingSales.get(sale.id)).toBeUndefined();
    expect((await db.products.get("product-1"))?.stock).toBe(5);
  });

  it("does nothing when the sale no longer exists", async () => {
    await expect(discardPendingSale("missing-sale")).resolves.toBeUndefined();
  });
});

describe("listConflictedSales", () => {
  it("returns only conflict/rejected sales, most recent first", async () => {
    const db = getOfflineDb();
    await db.pendingSales.bulkAdd([
      {
        id: "sale-old",
        items: [],
        payment_method: "efectivo",
        customer_name: null,
        discount_type: null,
        discount_value: "0",
        discount_source_override: null,
        totalEstimate: "10.00",
        createdAt: "2026-08-01T00:00:00.000Z",
        status: "conflict",
        errorMessage: "Stock insuficiente",
      },
      {
        id: "sale-new",
        items: [],
        payment_method: "efectivo",
        customer_name: null,
        discount_type: null,
        discount_value: "0",
        discount_source_override: null,
        totalEstimate: "5.00",
        createdAt: "2026-08-10T00:00:00.000Z",
        status: "rejected",
        errorMessage: "Producto no encontrado",
      },
      {
        id: "sale-synced",
        items: [],
        payment_method: "efectivo",
        customer_name: null,
        discount_type: null,
        discount_value: "0",
        discount_source_override: null,
        totalEstimate: "1.00",
        createdAt: "2026-08-15T00:00:00.000Z",
        status: "synced",
        errorMessage: null,
      },
    ]);

    const result = await listConflictedSales();
    expect(result.map((sale) => sale.id)).toEqual(["sale-new", "sale-old"]);
  });
});

describe("retryPendingSale", () => {
  it("clears the error and re-attempts the sync", async () => {
    const db = getOfflineDb();
    const sale = await queueSale({
      items: [{ product_id: "product-1", product_name: "Arroz", quantity: 1, unit_price: "10.00" }],
      paymentMethod: "efectivo",
      customerName: null,
      discountType: null,
      discountValue: "0",
      discountSourceOverride: null,
      totalEstimate: "10.00",
    });
    await db.pendingSales.update(sale.id, { status: "conflict", errorMessage: "Stock insuficiente" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              client_change_id: sale.id,
              entity: "sale",
              operation: "create",
              entity_id: sale.id,
              status: "accepted",
              server_version: 1,
              server_updated_at: new Date().toISOString(),
              error: null,
            },
          ],
          server_time: new Date().toISOString(),
        }),
      }),
    );

    await retryPendingSale(sale.id);

    const stored = await db.pendingSales.get(sale.id);
    expect(stored?.status).toBe("synced");
    expect(stored?.errorMessage).toBeNull();
  });
});

describe("pullCatalog", () => {
  it("upserts products from the server and advances the sync cursor", async () => {
    const db = getOfflineDb();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          changes: [
            {
              entity: "product",
              operation: "upsert",
              entity_id: "product-9",
              server_version: 3,
              server_updated_at: "2026-08-25T10:00:00Z",
              payload: {
                id: "product-9",
                name: "Fideo",
                price: "8.00",
                stock: 12,
                unit: "unidad",
                qr_code: "QR-9",
                discount_type: null,
                discount_value: "0",
              },
            },
          ],
          server_time: "2026-08-25T10:00:01Z",
        }),
      }),
    );

    const result = await pullCatalog();
    expect(result.ok).toBe(true);
    expect(result.updated).toBe(1);

    const product = await db.products.get("product-9");
    expect(product?.name).toBe("Fideo");
    expect(product?.stock).toBe(12);

    const meta = await db.meta.get("lastPulledAt");
    expect(meta?.value).toBe("2026-08-25T10:00:01Z");
  });

  it("removes products deleted on the server", async () => {
    const db = getOfflineDb();
    await db.products.put({
      id: "product-10",
      name: "Vieja",
      price: "5.00",
      stock: 1,
      unit: "unidad",
      qr_code: null,
      discount_type: null,
      discount_value: "0",
      effective_price: "5.00",
      deleted: false,
      serverUpdatedAt: "2026-08-01T00:00:00Z",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          changes: [
            {
              entity: "product",
              operation: "delete",
              entity_id: "product-10",
              server_version: null,
              server_updated_at: "2026-08-25T10:00:00Z",
              payload: {},
            },
          ],
          server_time: "2026-08-25T10:00:01Z",
        }),
      }),
    );

    await pullCatalog();
    const product = await db.products.get("product-10");
    expect(product).toBeUndefined();
  });
});

describe("product discounts offline", () => {
  const now = new Date("2026-11-11T12:00:00Z");

  it("applies a discount until its end date", () => {
    expect(computeEffectivePrice("10.00", "percentage", "10", "2026-11-12T00:00:00Z", now)).toBe("9.00");
    expect(computeEffectivePrice("10.00", "fixed", "2.5", null, now)).toBe("7.50");
    expect(computeEffectivePrice("10.00", "percentage", "10", "2026-11-11T12:00:00Z", now)).toBe("10.00");
    expect(computeEffectivePrice("10.00", "percentage", "10", "2026-11-01T00:00:00Z", now)).toBe("10.00");
    expect(computeEffectivePrice("10.00", "fixed", "15", null, now)).toBe("0.00");
  });

  it("knows when a discount expired", () => {
    expect(isDiscountExpired(null, now)).toBe(false);
    expect(isDiscountExpired(undefined, now)).toBe(false);
    expect(isDiscountExpired("2026-11-11T11:59:59Z", now)).toBe(true);
    expect(isDiscountExpired("2026-11-11T12:00:01Z", now)).toBe(false);
    expect(isDiscountExpired("no-es-fecha", now)).toBe(false);
  });

  it("stores the discount end date from the server", async () => {
    const db = getOfflineDb();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          changes: [
            {
              entity: "product",
              operation: "upsert",
              entity_id: "product-20",
              server_version: 1,
              server_updated_at: "2026-11-11T10:00:00Z",
              payload: {
                id: "product-20",
                name: "Yogur",
                price: "10.00",
                stock: 4,
                unit: "unidad",
                qr_code: null,
                discount_type: "percentage",
                discount_value: "10",
                discount_ends_at: "2999-01-01T00:00:00Z",
              },
            },
          ],
          server_time: "2026-11-11T10:00:01Z",
        }),
      }),
    );

    await pullCatalog();

    const product = await db.products.get("product-20");
    expect(product?.discount_ends_at).toBe("2999-01-01T00:00:00Z");
    expect(product?.effective_price).toBe("9.00");
  });
});

describe("pullCatalog en paralelo", () => {
  it("una sola descarga aunque la pidan el marco y Vender a la vez", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ changes: [], server_time: "2026-11-13T12:00:00Z" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      await Promise.all([pullCatalog(), pullCatalog(), pullCatalog()]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
