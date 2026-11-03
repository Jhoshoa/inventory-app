import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { refreshAuthSession, resetRefreshStateForTests } from "./refresh";

const fetchMock = vi.fn();
const auth = (n: number) => ({
  access_token: `access-${n}`,
  refresh_token: `refresh-${n}`,
  user: { id: "u1", email: "dueno@tienda.com" },
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("refreshAuthSession", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    resetRefreshStateForTests();
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("devuelve los tokens nuevos y reenvia la IP del cliente al backend", async () => {
    fetchMock.mockResolvedValueOnce(json(auth(2)));

    const result = await refreshAuthSession("refresh-1", { clientIp: "203.0.113.7" });

    expect(result).toEqual({ status: "ok", auth: auth(2) });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8001/api/v1/auth/refresh");
    expect(JSON.parse(init.body)).toEqual({ refresh_token: "refresh-1" });
    expect(init.headers["x-forwarded-for"]).toBe("203.0.113.7");
  });

  it("marca la sesion como invalida cuando el backend responde 401", async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: "Sesion expirada" }, 401));

    expect(await refreshAuthSession("viejo")).toEqual({ status: "invalid" });
  });

  it.each([500, 502, 503])("NO invalida la sesion si el backend responde %i", async (status) => {
    fetchMock.mockResolvedValueOnce(json({ detail: "caido" }, status));

    expect(await refreshAuthSession("valido")).toEqual({ status: "unavailable" });
  });

  it("NO invalida la sesion si el backend no responde", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    expect(await refreshAuthSession("valido")).toEqual({ status: "unavailable" });
  });

  it("trata una respuesta sin tokens como no disponible", async () => {
    fetchMock.mockResolvedValueOnce(json({ user: {} }));

    expect(await refreshAuthSession("valido")).toEqual({ status: "unavailable" });
  });

  it("comparte una sola renovacion entre peticiones simultaneas con el mismo token", async () => {
    fetchMock.mockImplementation(async () => json(auth(2)));

    const results = await Promise.all([
      refreshAuthSession("refresh-1"),
      refreshAuthSession("refresh-1"),
      refreshAuthSession("refresh-1"),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.status === "ok")).toBe(true);
  });

  it("reutiliza el resultado para peticiones que llegan con el token viejo justo despues", async () => {
    fetchMock.mockImplementation(async () => json(auth(2)));
    await refreshAuthSession("refresh-1");

    // El navegador aun no recibio las cookies nuevas y manda el token ya rotado.
    const late = await refreshAuthSession("refresh-1");

    expect(late).toEqual({ status: "ok", auth: auth(2) });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deja de reutilizar el resultado pasados 30 segundos", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => json(auth(2)));
    await refreshAuthSession("refresh-1");

    vi.advanceTimersByTime(31_000);
    await refreshAuthSession("refresh-1");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("no recuerda los fallos: el siguiente intento vuelve a preguntar", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json(auth(2)));

    expect(await refreshAuthSession("valido")).toEqual({ status: "unavailable" });
    expect(await refreshAuthSession("valido")).toEqual({ status: "ok", auth: auth(2) });
  });
});
