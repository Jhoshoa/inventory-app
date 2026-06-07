import { beforeEach, describe, expect, it, vi } from "vitest";
import { listSales } from "./api";

const getAuthToken = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getAuthToken: () => getAuthToken(),
}));

describe("listSales", () => {
  beforeEach(() => {
    getAuthToken.mockReset();
  });

  it("returns an unauthorized result instead of a fake empty list without token", async () => {
    getAuthToken.mockResolvedValueOnce(null);

    const result = await listSales({
      from_date: "2026-06-07",
      to_date: "2026-06-07",
      status: "all",
      limit: 50,
      offset: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(401);
      expect(result.error.code).toBe("unauthorized");
    }
  });
});
