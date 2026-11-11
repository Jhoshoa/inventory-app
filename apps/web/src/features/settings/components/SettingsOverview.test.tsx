import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsOverview } from "./SettingsOverview";
import type { Session } from "@/lib/auth/session";
import { DEFAULT_STOREFRONT_SETTINGS } from "@/features/storefront/settings";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/settings",
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("./StoreEditorDialog", () => ({
  StoreEditorDialog: () => <div data-testid="store-editor-dialog"><button>Editar</button></div>,
}));

vi.mock("@/features/users/components/UsersSection", () => ({
  UsersSection: () => <div data-testid="users-section">Users section content</div>,
}));

const emptyUsers = { ok: true as const, data: { items: [], total: 0, limit: 50, offset: 0 } };
const emptyInvitations = { ok: true as const, data: { items: [], total: 0, limit: 50, offset: 0 } };

const session: Session = {
  userId: "user-1",
  email: "owner@example.com",
  storeId: "store-1",
  storeName: "Mi tienda",
  fullName: null,
  role: "owner",
    trialExpiresAt: null,
    daysUntilTrialEnds: null,
    subscriptionStatus: null,
    accessStatus: null,
  };

describe("SettingsOverview", () => {
  it("renders settings as an administrative center", () => {
    render(
      <SettingsOverview
        session={session}
        users={emptyUsers}
        userInvitations={emptyInvitations}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tienda" })).toBeInTheDocument();
    expect(screen.getByText("Mi tienda")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Usuario actual" })).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("Dueño").length).toBeGreaterThan(0);
    expect(screen.getByText("Permisos")).toBeInTheDocument();
    expect(screen.getByText("Exportar CSV")).toBeInTheDocument();
    // La caja tiene su propia página (Fase 2 del rediseño).
    expect(screen.getByText("Caja y jornada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a Caja" })).toHaveAttribute("href", "/dashboard/caja");
    expect(screen.queryByRole("button", { name: "Abrir tienda" })).not.toBeInTheDocument();
    expect(screen.getByTestId("users-section")).toBeInTheDocument();
  });

  it("shows store data when storeData is provided", () => {
    render(
      <SettingsOverview
        session={session}
        storeData={{
          id: "store-1",
          name: "Mi Tienda Editada",
          address: "Av. Siempre Viva 123",
          phone: "77712345",
          is_active: true,
          allow_percentage_discount: false,
          max_percentage_discount: "0",
          allow_manual_discount: false,
          max_manual_discount_amount: "0",
          allow_cashier_discount_override: false,
          storefront_enabled: false,
          storefront_slug: null,
          storefront_tier: "none",
          storefront_logo_url: null,
          storefront_banner_url: null,
          storefront_color_primary: null,
          storefront_color_secondary: null,
          storefront_description: null,
          storefront_whatsapp: null,
          storefront_payment_qr_url: null,
          storefront_payment_instructions: null,
          storefront_settings: DEFAULT_STOREFRONT_SETTINGS,
        }}
      />,
    );

    expect(screen.getByText("Mi Tienda Editada")).toBeInTheDocument();
    expect(screen.getByText("Av. Siempre Viva 123")).toBeInTheDocument();
    expect(screen.getByText("+591 77712345")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
  });

  it("hides edit button for cashiers even with storeData", () => {
    render(
      <SettingsOverview
        session={{ ...session, role: "cashier" }}
        storeData={{
          id: "store-1",
          name: "Mi Tienda",
          address: null,
          phone: null,
          is_active: true,
          allow_percentage_discount: false,
          max_percentage_discount: "0",
          allow_manual_discount: false,
          max_manual_discount_amount: "0",
          allow_cashier_discount_override: false,
          storefront_enabled: false,
          storefront_slug: null,
          storefront_tier: "none",
          storefront_logo_url: null,
          storefront_banner_url: null,
          storefront_color_primary: null,
          storefront_color_secondary: null,
          storefront_description: null,
          storefront_whatsapp: null,
          storefront_payment_qr_url: null,
          storefront_payment_instructions: null,
          storefront_settings: DEFAULT_STOREFRONT_SETTINGS,
        }}
      />,
    );

    expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument();
  });

  it("hides the users section for cashiers", () => {
    render(
      <SettingsOverview
        session={{ ...session, role: "cashier" }}
        users={emptyUsers}
        userInvitations={emptyInvitations}
      />,
    );

    expect(screen.getAllByText("Cajero").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("users-section")).not.toBeInTheDocument();
  });
});

