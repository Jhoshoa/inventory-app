import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOfflineDb } from "./db";
import { useConnectionStatus } from "./useConnectionStatus";

beforeEach(async () => {
  const db = getOfflineDb();
  await db.products.clear();
  await db.pendingSales.clear();
  await db.meta.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ changes: [], server_time: new Date().toISOString(), results: [] }),
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

describe("useConnectionStatus", () => {
  it("reports offline when navigator.onLine is false", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

    const { result } = renderHook(() => useConnectionStatus());

    await waitFor(() => expect(result.current.isOnline).toBe(false));
  });

  it("reports the pending sale count from IndexedDB", async () => {
    const db = getOfflineDb();
    await db.pendingSales.add({
      id: "sale-1",
      items: [],
      payment_method: "efectivo",
      customer_name: null,
      discount_type: null,
      discount_value: "0",
      discount_source_override: null,
      totalEstimate: "10.00",
      createdAt: new Date().toISOString(),
      status: "pending",
      errorMessage: null,
    });

    const { result } = renderHook(() => useConnectionStatus());

    await waitFor(() => expect(result.current.pendingCount).toBe(1));
  });

  it("syncs when the browser comes back online", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const { result } = renderHook(() => useConnectionStatus());
    await waitFor(() => expect(result.current.isOnline).toBe(false));

    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(result.current.isOnline).toBe(true));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });
});
