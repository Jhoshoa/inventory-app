import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe("AppShell", () => {
  it("renders primary navigation links", () => {
    render(
      <AppShell
        session={{
          userId: "user-1",
          email: "owner@example.com",
          storeId: "store-1",
          storeName: "Mi tienda",
          fullName: null,
          role: "owner",
        }}
      >
        <p>Content</p>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /productos/i })).toHaveAttribute(
      "href",
      "/dashboard/products",
    );
  });
});
