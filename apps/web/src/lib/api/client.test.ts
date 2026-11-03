import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirectMock(path) }));

const requestHeadersMock = vi.fn();
vi.mock("next/headers", () => ({ headers: () => requestHeadersMock() }));

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("apiRequest", () => {
  afterEach(() => {
    fetchMock.mockReset();
    redirectMock.mockClear();
    requestHeadersMock.mockReset();
  });

  it("returns data for successful responses", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await apiRequest<{ ok: boolean }>("/health");

    expect(result).toEqual({ ok: true, data: { ok: true } });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/health",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("normalizes unauthorized errors", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await apiRequest("/dashboard/summary");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(401);
      expect(result.error.code).toBe("unauthorized");
      expect(result.error.message).toBe("Unauthorized");
    }
  });

  it("normalizes validation errors", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: [{ loc: ["email"] }] }), {
        status: 422,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await apiRequest("/auth/login", { method: "POST" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(422);
      expect(result.error.code).toBe("validation_error");
    }
  });

  it("reenvía al backend la IP real del visitante de la petición en curso", async () => {
    requestHeadersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.2" }));
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await apiRequest("/auth/login", { method: "POST", body: {} });

    expect(fetchMock.mock.calls[0][1].headers.get("x-forwarded-for")).toBe("203.0.113.7");
  });

  it("usa la IP explícita cuando se indica, y null desactiva el reenvío", async () => {
    requestHeadersMock.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.7" }));
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));

    await apiRequest("/x", { clientIp: "198.51.100.4" });
    await apiRequest("/x", { clientIp: null });

    expect(fetchMock.mock.calls[0][1].headers.get("x-forwarded-for")).toBe("198.51.100.4");
    expect(fetchMock.mock.calls[1][1].headers.has("x-forwarded-for")).toBe(false);
  });

  it("funciona fuera de una petición (tests, build) sin reenviar IP", async () => {
    requestHeadersMock.mockRejectedValue(new Error("headers was called outside a request scope"));
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const result = await apiRequest("/health");

    expect(result.ok).toBe(true);
    expect(fetchMock.mock.calls[0][1].headers.has("x-forwarded-for")).toBe(false);
  });

  it("no se traga los errores con que Next marca una página como dinámica", async () => {
    requestHeadersMock.mockRejectedValue(
      Object.assign(new Error("Dynamic server usage"), { digest: "DYNAMIC_SERVER_USAGE" }),
    );

    await expect(apiRequest("/health")).rejects.toThrow("Dynamic server usage");
  });

  it("un 401 con token manda a /login SIN intentar renovar la sesión por su cuenta", async () => {
    // Renovar acá rotaría el refresh token sin poder guardar las cookies nuevas.
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Token inválido" }), { status: 401 }),
    );

    await expect(apiRequest("/products", { token: "vencido" })).rejects.toThrow(
      "NEXT_REDIRECT:/login?session=expired",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("un 401 sin token (login fallido) se devuelve como error, sin redirigir", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Credenciales invalidas" }), { status: 401 }),
    );

    const result = await apiRequest("/auth/login", { method: "POST", body: {} });

    expect(result.ok).toBe(false);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
