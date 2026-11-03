import { describe, expect, it } from "vitest";
import { decodeJwtExp } from "./jwt";

function jwtWith(claims: unknown) {
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `cabecera.${body}.firma`;
}

describe("decodeJwtExp", () => {
  it("lee el vencimiento de un JWT", () => {
    expect(decodeJwtExp(jwtWith({ exp: 1_900_000_000, sub: "u1" }))).toBe(1_900_000_000);
  });

  it("soporta el base64url sin relleno que usa Supabase", () => {
    // Un payload cuyo largo no es multiplo de 4 en base64 (necesita relleno).
    const token = jwtWith({ exp: 1_900_000_000, email: "dueno@mitienda.com" });
    expect(token.split(".")[1]).not.toMatch(/=/);
    expect(decodeJwtExp(token)).toBe(1_900_000_000);
  });

  it("devuelve null para tokens que no son JWT (tokens de desarrollo)", () => {
    expect(decodeJwtExp("dev-token-123")).toBeNull();
    expect(decodeJwtExp("00000000-0000-0000-0000-000000000001")).toBeNull();
  });

  it("devuelve null si el payload esta roto o no tiene exp numerico", () => {
    expect(decodeJwtExp("a.%%%.c")).toBeNull();
    expect(decodeJwtExp(jwtWith({ sub: "u1" }))).toBeNull();
    expect(decodeJwtExp(jwtWith({ exp: "manana" }))).toBeNull();
    expect(decodeJwtExp(jwtWith(null))).toBeNull();
  });
});
