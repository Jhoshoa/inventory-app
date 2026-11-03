import { describe, expect, it } from "vitest";
import { clientIpFromHeaders, forwardedForHeaders } from "./clientIp";

const headers = (init: Record<string, string>) => new Headers(init);

describe("clientIpFromHeaders", () => {
  it("usa la primera IP de x-forwarded-for", () => {
    expect(clientIpFromHeaders(headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.2" }))).toBe("203.0.113.7");
  });

  it("acepta IPv6", () => {
    expect(clientIpFromHeaders(headers({ "x-forwarded-for": "2a02:4780:95:60ae::1" }))).toBe("2a02:4780:95:60ae::1");
  });

  it("cae a x-real-ip cuando no hay x-forwarded-for", () => {
    expect(clientIpFromHeaders(headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("ignora valores que no son una IP (no se reenvia texto arbitrario al backend)", () => {
    expect(clientIpFromHeaders(headers({ "x-forwarded-for": "no-soy-una-ip" }))).toBeNull();
    expect(clientIpFromHeaders(headers({ "x-forwarded-for": "1.2.3.4.5" }))).toBeNull();
    // Un objeto de cabeceras cualquiera (no un Headers real) con un valor malicioso.
    const hostile = { get: (name: string) => (name === "x-forwarded-for" ? "evil\r\nx-admin: 1" : null) };
    expect(clientIpFromHeaders(hostile)).toBeNull();
  });

  it("devuelve null sin cabeceras de proxy", () => {
    expect(clientIpFromHeaders(headers({}))).toBeNull();
  });
});

describe("forwardedForHeaders", () => {
  it("arma la cabecera solo si hay IP", () => {
    expect(forwardedForHeaders("203.0.113.7")).toEqual({ "x-forwarded-for": "203.0.113.7" });
    expect(forwardedForHeaders(null)).toEqual({});
    expect(forwardedForHeaders(undefined)).toEqual({});
  });
});
