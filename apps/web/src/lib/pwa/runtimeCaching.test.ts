import { describe, expect, it } from "vitest";
import { pwaRuntimeCaching } from "./runtimeCaching";

const ORIGIN = "https://tutiendamiga.digital";

function ruleFor(href: string, init: { destination?: string; mode?: string } = {}) {
  const url = new URL(href, ORIGIN);
  const request = { destination: init.destination ?? "", mode: init.mode ?? "cors" } as Request;
  const match = { url, request, sameOrigin: url.origin === ORIGIN };
  return pwaRuntimeCaching.find((rule) => rule.urlPattern(match));
}

describe("service worker caching", () => {
  it("leaves Cloudinary images (and any other domain) to the browser", () => {
    expect(
      ruleFor("https://res.cloudinary.com/demo/image/upload/v1/products/a.jpg", { destination: "image", mode: "no-cors" }),
    ).toBeUndefined();
  });

  it("never caches the public catalog, so prices and stock are always fresh", () => {
    expect(ruleFor("/t/tienda-pau", { mode: "navigate" })).toBeUndefined();
    expect(ruleFor("/t/tienda-pau/producto/123", { mode: "navigate" })).toBeUndefined();
    // Datos de navegacion de Next (RSC) del catalogo tampoco.
    expect(ruleFor("/t/tienda-pau?q=leche&_rsc=abc")).toBeUndefined();
  });

  it("keeps the API on the network", () => {
    expect(ruleFor("/api/products/pos?q=le")?.handler).toBe("NetworkOnly");
  });

  it("caches the app's static files and fonts for offline use", () => {
    expect(ruleFor("/_next/static/chunks/main-abc.js", { destination: "script" })).toMatchObject({
      handler: "CacheFirst",
      options: { cacheName: "next-static" },
    });
    expect(ruleFor("/_next/static/media/font.woff2", { destination: "font" })?.handler).toBe("CacheFirst");
  });

  it("serves dashboard pages network first, with a bounded cache", () => {
    const rule = ruleFor("/dashboard/pos", { mode: "navigate" });
    expect(rule?.handler).toBe("NetworkFirst");
    expect(rule?.options?.expiration?.maxEntries).toBeGreaterThan(0);
  });

  it("does not use the old catch-all cache", () => {
    expect(pwaRuntimeCaching.some((rule) => rule.options?.cacheName === "app-shell")).toBe(false);
  });
});
