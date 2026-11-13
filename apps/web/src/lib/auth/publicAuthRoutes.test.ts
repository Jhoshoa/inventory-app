import { describe, expect, it } from "vitest";
import { authRewrites } from "./publicAuthRoutes";

describe("authRewrites", () => {
  it("forwards only the three paths the browser needs", () => {
    expect(authRewrites("http://inventory-auth-gateway:8000/")).toEqual([
      { source: "/auth/v1/verify", destination: "http://inventory-auth-gateway:8000/auth/v1/verify" },
      { source: "/auth/v1/authorize", destination: "http://inventory-auth-gateway:8000/auth/v1/authorize" },
      { source: "/auth/v1/callback", destination: "http://inventory-auth-gateway:8000/auth/v1/callback" },
    ]);
  });

  it("does not expose admin, token or user endpoints", () => {
    const sources = authRewrites("http://gw:8000").map((rule) => rule.source);
    for (const hidden of ["/auth/v1/admin/users", "/auth/v1/token", "/auth/v1/user", "/auth/v1/:path*"]) {
      expect(sources).not.toContain(hidden);
    }
  });

  it("adds nothing when there is no gateway (development without the stack)", () => {
    expect(authRewrites(undefined)).toEqual([]);
    expect(authRewrites("  ")).toEqual([]);
  });
});
