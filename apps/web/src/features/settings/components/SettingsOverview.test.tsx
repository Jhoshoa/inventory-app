import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsOverview } from "./SettingsOverview";
import type { Session } from "@/lib/auth/session";
import type { StoreDay } from "@/features/store-day/types";

vi.mock("next/navigation", () => ({
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
        storeDay={{ ok: true, data: storeDay }}
        storeDayEvents={{
          ok: true,
          data: [
            {
              id: "event-1",
              business_day_id: "day-1",
              store_id: "store-1",
              event_type: "open",
              note: "Inicio",
              created_by_user_id: "user-1",
              created_at: "2026-05-21T12:00:00Z",
            },
          ],
        }}
        users={emptyUsers}
        userInvitations={emptyInvitations}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tienda" })).toBeInTheDocument();
    expect(screen.getByText("Mi tienda")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Usuario actual" })).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("Propietario").length).toBeGreaterThan(0);
    expect(screen.getByText("Permisos")).toBeInTheDocument();
    expect(screen.getByText("Exportar CSV")).toBeInTheDocument();
    expect(screen.getByText("Operacion diaria")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir tienda" })).toBeInTheDocument();
    expect(screen.getByText("Apertura")).toBeInTheDocument();
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
        }}
        storeDay={{ ok: true, data: storeDay }}
        storeDayEvents={{
          ok: true,
          data: [
            {
              id: "event-1",
              business_day_id: "day-1",
              store_id: "store-1",
              event_type: "open",
              note: "Inicio",
              created_by_user_id: "user-1",
              created_at: "2026-05-21T12:00:00Z",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Mi Tienda Editada")).toBeInTheDocument();
    expect(screen.getByText("Av. Siempre Viva 123")).toBeInTheDocument();
    expect(screen.getByText("77712345")).toBeInTheDocument();
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
        }}
        storeDay={{ ok: true, data: storeDay }}
      />,
    );

    expect(screen.getByText("Mi Tienda")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument();
  });

  it("hides the users section for cashiers", () => {
    render(
      <SettingsOverview
        session={{ ...session, role: "cashier" }}
        storeDay={{ ok: true, data: storeDay }}
        users={emptyUsers}
        userInvitations={emptyInvitations}
      />,
    );

    expect(screen.getAllByText("Cajero").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("users-section")).not.toBeInTheDocument();
  });
});

const storeDay: StoreDay = {
  id: null,
  status: "closed",
  business_date: "2026-05-21",
  opened_at: null,
  closed_at: null,
  opened_by_user_id: null,
  closed_by_user_id: null,
  opening_note: null,
  closing_note: null,
  opening_cash_amount: null,
  expected_cash_amount: null,
  counted_cash_amount: null,
  cash_difference_amount: null,
  closing_sales_total: null,
  closing_sales_count: null,
  closing_voided_sales_count: null,
  closing_items_count: null,
  closing_cash_sales_total: null,
  closing_qr_sales_total: null,
  closing_transfer_sales_total: null,
  closing_card_sales_total: null,
  closing_cash_movements_in_total: null,
  closing_cash_movements_out_total: null,
  closing_cash_movements_count: null,
  closing_snapshot_at: null,
  sales_total: null,
  sales_count: null,
  voided_sales_count: null,
  timezone: "America/La_Paz",
  first_business_date: null,
};
