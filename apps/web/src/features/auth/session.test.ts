import { afterEach, describe, expect, it, vi } from "vitest";
import { authErrorMessage, destinationAfterLogin, emailFromAccessToken } from "./session";

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("authErrorMessage", () => {
  it("traduce 429 y 401 a palabras de la tienda", () => {
    expect(authErrorMessage(429, "Too many", "x")).toBe("Demasiados intentos. Espera unos minutos y vuelve a intentar.");
    expect(authErrorMessage(401, "Invalid login credentials", "x")).toBe("Correo o contraseña incorrectos.");
    expect(authErrorMessage(401, "Unauthorized", "x")).toBe("Correo o contraseña incorrectos.");
    expect(authErrorMessage(401, "Email not confirmed", "x")).toBe("Confirma tu correo antes de entrar: revisa tu bandeja de entrada.");
    expect(authErrorMessage(400, "Email not confirmed", "x")).toBe("Confirma tu correo antes de entrar: revisa tu bandeja de entrada.");
  });

  it("deja pasar el motivo del servidor o usa el de respaldo", () => {
    expect(authErrorMessage(409, "Ese correo ya tiene cuenta", "x")).toBe("Ese correo ya tiene cuenta");
    expect(authErrorMessage(500, undefined, "No se pudo")).toBe("No se pudo");
  });
});

describe("destinationAfterLogin", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("el dueño va a Inicio sin preguntar por la caja", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await destinationAfterLogin("owner")).toBe("/dashboard");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["caja abierta", () => Promise.resolve(reply({ status: "open" })), "/dashboard/pos"],
    ["caja cerrada", () => Promise.resolve(reply({ status: "closed" })), "/dashboard"],
    ["sin caja del día", () => Promise.resolve(reply({ message: "no" }, 404)), "/dashboard"],
    ["sin conexión", () => Promise.reject(new TypeError("offline")), "/dashboard"],
  ])("cajero con %s", async (_label, answer, expected) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(answer));
    expect(await destinationAfterLogin("cashier")).toBe(expected);
  });
});

describe("emailFromAccessToken", () => {
  it("lee el correo del token y no falla con tokens raros", () => {
    const payload = btoa(JSON.stringify({ email: "rosa@correo.com", sub: "1" })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
    expect(emailFromAccessToken(`h.${payload}.s`)).toBe("rosa@correo.com");
    expect(emailFromAccessToken("no-es-un-jwt")).toBeNull();
    expect(emailFromAccessToken(null)).toBeNull();
  });
});
