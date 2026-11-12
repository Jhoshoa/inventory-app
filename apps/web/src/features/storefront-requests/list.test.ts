import { describe, expect, it } from "vitest";
import {
  customerWhatsappMessage,
  moveCount,
  orderLine,
  orderSummary,
  parseOrderTab,
  receivedAt,
  relativeTime,
  statusCounts,
  toPosOrder,
} from "./list";
import { makeRequest } from "./test/fixtures";

const NOW = Date.parse("2026-11-12T15:47:00Z");

describe("orders list helpers", () => {
  it("reads the tab from the address, pending by default", () => {
    expect(parseOrderTab(undefined)).toBe("pending");
    expect(parseOrderTab("closed")).toBe("closed");
    expect(parseOrderTab("all")).toBe("all");
    expect(parseOrderTab("nope")).toBe("pending");
  });

  it("uses the per-status counts (B7) and moves them on a change", () => {
    const counts = statusCounts({ pending_count: 2, status_counts: { pending: 2, contacted: 3, closed: 7 } });
    expect(counts).toEqual({ pending: 2, contacted: 3, closed: 7 });
    expect(moveCount(counts, "pending", "contacted")).toEqual({ pending: 1, contacted: 4, closed: 7 });
    expect(statusCounts({ pending_count: 2 })).toBeNull();
  });

  it("describes the order, also old single-product requests", () => {
    expect(orderSummary(makeRequest())).toBe("3 productos");
    expect(orderLine(makeRequest())).toBe("3 productos · Envío a domicilio");
    const old = makeRequest({ items: [], total: null, delivery_method: null, product_name: "Pan de batalla", product_id: "p-2" });
    expect(orderSummary(old)).toBe("Pan de batalla");
    expect(orderLine(old)).toBe("Pan de batalla");
    expect(toPosOrder(old).items).toEqual([{ productId: "p-2", name: "Pan de batalla", quantity: 1 }]);
  });

  it("says how long ago it arrived", () => {
    expect(relativeTime("2026-11-12T15:22:00Z", NOW)).toBe("hace 25 min");
    expect(relativeTime("2026-11-12T13:40:00Z", NOW)).toBe("hace 2 h");
    expect(relativeTime("2026-11-11T22:10:00Z", NOW)).toBe("ayer 18:10");
    expect(relativeTime("2026-11-09T13:30:00Z", NOW)).toBe("09/11 09:30");
    expect(receivedAt("2026-11-12T15:22:00Z", NOW)).toBe("hoy 11:22");
  });

  it("writes the WhatsApp message with the order", () => {
    const text = customerWhatsappMessage(makeRequest(), "Tienda Local");
    expect(text).toContain("Hola María Choque, te escribo de Tienda Local por tu pedido:");
    expect(text).toMatch(/• 20 × Pan de batalla — Bs\s?10,00/);
    expect(text).toMatch(/Total: Bs\s?56,00/);
    expect(text).toContain("Envío a domicilio");
  });
});
