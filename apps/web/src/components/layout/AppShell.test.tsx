import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/session";
import { AppShell } from "./AppShell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe("AppShell", () => {
  const ownerSession: Session = {
    userId: "user-1",
    email: "owner@example.com",
    storeId: "store-1",
    storeName: "Mi tienda",
    fullName: null,
    role: "owner",
  };

  it("renders primary navigation links", () => {
    render(
      <AppShell session={ownerSession}>
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
    expect(screen.getByRole("link", { name: /import image/i })).toHaveAttribute(
      "href",
      "/dashboard/imports",
    );
    expect(screen.getByRole("link", { name: /ajustes/i })).toHaveAttribute(
      "href",
      "/dashboard/settings",
    );
  });

  it("hides owner navigation links for cashier", () => {
    render(
      <AppShell session={{ ...ownerSession, role: "cashier", email: "cashier@example.com" }}>
        <p>Content</p>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: /productos/i })).toHaveAttribute(
      "href",
      "/dashboard/products",
    );
    expect(screen.queryByRole("link", { name: /import image/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ajustes/i })).not.toBeInTheDocument();
  });
});
