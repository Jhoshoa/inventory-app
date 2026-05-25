import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/session";
import { AppShell } from "./AppShell";

let pathname = "/dashboard/products/labels";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
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

  beforeEach(() => {
    pathname = "/dashboard/products/labels";
  });

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
    expect(screen.getByRole("link", { name: /importaciones/i })).toHaveAttribute(
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
    expect(screen.queryByRole("link", { name: /importaciones/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ajustes/i })).not.toBeInTheDocument();
  });

  it("marks parent sidebar item active for child routes", () => {
    render(
      <AppShell session={ownerSession}>
        <p>Content</p>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: /productos/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /dashboard/i })).not.toHaveAttribute("aria-current");
  });

  it("opens and closes the mobile navigation drawer", () => {
    render(
      <AppShell session={ownerSession}>
        <p>Content</p>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: /abrir menu/i }));

    expect(screen.getByRole("dialog", { name: /menu de navegacion/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /productos/i })[1]).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /^cerrar menu$/i })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: /^cerrar menu$/i }));

    expect(screen.queryByRole("dialog", { name: /menu de navegacion/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /abrir menu/i })).toHaveFocus();
  });

  it("closes the mobile navigation drawer with Escape", () => {
    render(
      <AppShell session={ownerSession}>
        <p>Content</p>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: /abrir menu/i }));
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: /menu de navegacion/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /abrir menu/i })).toHaveFocus();
  });

  it("keeps keyboard focus inside the mobile navigation drawer", () => {
    render(
      <AppShell session={ownerSession}>
        <p>Content</p>
      </AppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: /abrir menu/i }));

    const mobileHomeLink = screen.getAllByRole("link", { name: /inventory app/i })[1];
    const mobileSettingsLink = screen.getAllByRole("link", { name: /ajustes/i })[1];

    mobileHomeLink.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(mobileSettingsLink).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab" });
    expect(mobileHomeLink).toHaveFocus();
  });
});
