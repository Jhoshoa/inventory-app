// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, SESSION_COOKIE } from "./cookies";
import { resetRefreshStateForTests } from "./refresh";
import { refreshSessionIfNeeded } from "./sessionMiddleware";

const fetchMock = vi.fn();

function jwt(expInSeconds: number) {
  const exp = Math.floor(Date.now() / 1000) + expInSeconds;
  return `cabecera.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.firma`;
}

function request(path: string, cookies: Record<string, string>, headers: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return new NextRequest(`http://localhost:3010${path}`, { headers: { cookie, ...headers } });
}

const refreshedAuth = () => ({
  access_token: jwt(3600),
  refresh_token: "refresh-nuevo",
  user: { id: "u1", email: "dueno@tienda.com", store_id: "s1", role: "owner" },
});
const backendOk = () =>
  new Response(JSON.stringify(refreshedAuth()), { status: 200, headers: { "content-type": "application/json" } });
const backendStatus = (status: number) => new Response("{}", { status });

describe("refreshSessionIfNeeded", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    resetRefreshStateForTests();
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("no hace nada si el token todavia tiene vigencia de sobra", async () => {
    const response = await refreshSessionIfNeeded(
      request("/dashboard", { [ACCESS_TOKEN_COOKIE]: jwt(3000), [REFRESH_TOKEN_COOKIE]: "refresh-1" }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.cookies.getAll()).toHaveLength(0);
  });

  it("no hace nada sin sesion", async () => {
    await refreshSessionIfNeeded(request("/dashboard", {}));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no toca los tokens de desarrollo (no son JWT y no vencen)", async () => {
    await refreshSessionIfNeeded(
      request("/dashboard", { [ACCESS_TOKEN_COOKIE]: "dev-token-123", [REFRESH_TOKEN_COOKIE]: "dev-refresh-123" }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no toca las rutas de auth (login, logout...)", async () => {
    await refreshSessionIfNeeded(
      request("/api/auth/login", { [ACCESS_TOKEN_COOKIE]: jwt(-100), [REFRESH_TOKEN_COOKIE]: "refresh-1" }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renueva un token vencido y deja las cookies nuevas en la respuesta Y en la peticion en curso", async () => {
    fetchMock.mockResolvedValueOnce(backendOk());

    const response = await refreshSessionIfNeeded(
      request("/dashboard/products", { [ACCESS_TOKEN_COOKIE]: jwt(-10), [REFRESH_TOKEN_COOKIE]: "refresh-1" }),
    );

    // Para el navegador:
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe("refresh-nuevo");
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBeTruthy();
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBeTruthy();
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    // Para los Server Components de esta misma peticion:
    expect(response.headers.get("x-middleware-request-cookie")).toContain(`${REFRESH_TOKEN_COOKIE}=refresh-nuevo`);
  });

  it("renueva un token que vence en menos de un minuto", async () => {
    fetchMock.mockResolvedValueOnce(backendOk());

    await refreshSessionIfNeeded(
      request("/dashboard", { [ACCESS_TOKEN_COOKIE]: jwt(30), [REFRESH_TOKEN_COOKIE]: "refresh-1" }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renueva cuando el navegador ya descarto la cookie del access token pero queda el refresh", async () => {
    fetchMock.mockResolvedValueOnce(backendOk());

    const response = await refreshSessionIfNeeded(request("/dashboard", { [REFRESH_TOKEN_COOKIE]: "refresh-1" }));

    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBeTruthy();
  });

  it("reenvia la IP real del visitante al backend", async () => {
    fetchMock.mockResolvedValueOnce(backendOk());

    await refreshSessionIfNeeded(
      request(
        "/dashboard",
        { [ACCESS_TOKEN_COOKIE]: jwt(-10), [REFRESH_TOKEN_COOKIE]: "refresh-1" },
        { "x-forwarded-for": "203.0.113.7" },
      ),
    );

    expect(fetchMock.mock.calls[0][1].headers["x-forwarded-for"]).toBe("203.0.113.7");
  });

  it("si el refresh token ya no sirve: borra las cookies y manda a /login (paginas)", async () => {
    fetchMock.mockResolvedValueOnce(backendStatus(401));

    const response = await refreshSessionIfNeeded(
      request("/dashboard", { [ACCESS_TOKEN_COOKIE]: jwt(-10), [REFRESH_TOKEN_COOKIE]: "usado" }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3010/login?session=expired");
    for (const name of [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, SESSION_COOKIE]) {
      expect(response.cookies.get(name)?.value).toBe("");
    }
  });

  it("redirige al dominio publico, no al host interno del contenedor, detras de un proxy", async () => {
    fetchMock.mockResolvedValueOnce(backendStatus(401));

    const response = await refreshSessionIfNeeded(
      request(
        "/dashboard",
        { [ACCESS_TOKEN_COOKIE]: jwt(-10), [REFRESH_TOKEN_COOKIE]: "usado" },
        { "x-forwarded-host": "app.mitienda.com", "x-forwarded-proto": "https", host: "0.0.0.0:3010" },
      ),
    );

    expect(response.headers.get("location")).toBe("https://app.mitienda.com/login?session=expired");
  });

  it("si el refresh token ya no sirve: responde 401 JSON a las llamadas /api", async () => {
    fetchMock.mockResolvedValueOnce(backendStatus(401));

    const response = await refreshSessionIfNeeded(
      request("/api/sync/pull", { [ACCESS_TOKEN_COOKIE]: jwt(-10), [REFRESH_TOKEN_COOKIE]: "usado" }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Sesión expirada" });
  });

  it("si el backend esta caido NO cierra la sesion: deja pasar la peticion con las cookies intactas", async () => {
    fetchMock.mockResolvedValueOnce(backendStatus(503));

    const response = await refreshSessionIfNeeded(
      request("/dashboard", { [ACCESS_TOKEN_COOKIE]: jwt(-10), [REFRESH_TOKEN_COOKIE]: "valido" }),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.cookies.getAll()).toHaveLength(0);
  });

  it("varias peticiones simultaneas del mismo navegador renuevan una sola vez", async () => {
    fetchMock.mockImplementation(async () => backendOk());
    const stale = () =>
      request("/dashboard", { [ACCESS_TOKEN_COOKIE]: jwt(-10), [REFRESH_TOKEN_COOKIE]: "refresh-1" });

    await Promise.all([refreshSessionIfNeeded(stale()), refreshSessionIfNeeded(stale()), refreshSessionIfNeeded(stale())]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
