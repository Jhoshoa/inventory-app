import { describe, expect, it } from "vitest";
import { randomUuid } from "./uuid";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("randomUuid", () => {
  it("usa crypto.randomUUID cuando existe", () => {
    expect(randomUuid()).toMatch(UUID_V4);
  });

  it("también funciona sin randomUUID (http por la IP de la red)", () => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      const ids = new Set(Array.from({ length: 50 }, () => randomUuid()));
      expect(ids.size).toBe(50);
      for (const id of ids) expect(id).toMatch(UUID_V4);
    } finally {
      delete (crypto as { randomUUID?: unknown }).randomUUID;
    }
  });
});
