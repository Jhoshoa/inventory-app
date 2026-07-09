import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsOverview } from "./SettingsOverview";
import type { Session } from "@/lib/auth/session";
import type { StoreDay } from "@/features/store-day/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const session: Session = {
  userId: "user-1",
  email: "owner@example.com",
  storeId: "store-1",
  storeName: "Mi tienda",
  fullName: null,
  role: "owner",
  trialExpiresAt: null,
  daysUntilTrialEnds: null,
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
      />,
    );

    expect(screen.getByRole("heading", { name: "Tienda" })).toBeInTheDocument();
    expect(screen.getByText("Mi tienda")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Usuario actual" })).toBeInTheDocument();
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("Owner").length).toBeGreaterThan(0);
    expect(screen.getByText("Permisos")).toBeInTheDocument();
    expect(screen.getByText("Exportar CSV")).toBeInTheDocument();
    expect(screen.getByText("Operacion diaria")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir tienda" })).toBeInTheDocument();
    expect(screen.getByText("Apertura")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gestion de usuarios" })).toBeInTheDocument();
    expect(screen.getByText("Planificado")).toBeInTheDocument();
    expect(screen.getByText("Owner tendra acceso")).toBeInTheDocument();
  });

  it("renders planned users as read-only context for cashiers", () => {
    render(
      <SettingsOverview
        session={{ ...session, role: "cashier" }}
        storeDay={{ ok: true, data: storeDay }}
      />,
    );

    expect(screen.getAllByText("Cashier").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Gestion de usuarios" })).toBeInTheDocument();
    expect(screen.getByText("Solo lectura")).toBeInTheDocument();
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
