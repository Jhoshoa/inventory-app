import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("apiRequest", () => {
  afterEach(() => {
    fetchMock.mockReset();
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
      "http://localhost:8000/api/v1/health",
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
});
