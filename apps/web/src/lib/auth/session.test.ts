import { describe, expect, it } from "vitest";
import { serializeSession } from "./session";
import type { AuthUser } from "./types";

describe("serializeSession", () => {
  it("creates a base64url encoded session payload", () => {
    const user: AuthUser = {
      id: "user-1",
      email: "owner@example.com",
      store_id: "store-1",
      role: "owner",
    };

    const encoded = serializeSession(user);
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));

    expect(decoded).toEqual(user);
  });
});
