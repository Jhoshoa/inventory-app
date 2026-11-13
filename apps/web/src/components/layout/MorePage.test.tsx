import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/session";
import { MorePage } from "./MorePage";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const owner: Session = {
  userId: "user-1",
  email: "rosa@example.com",
  storeId: "store-1",
  storeName: "Tienda Local",
  fullName: "Rosa Quispe",
  role: "owner",
  trialExpiresAt: null,
  daysUntilTrialEnds: 9,
  subscriptionStatus: "trial",
  accessStatus: null,
};

describe("MorePage", () => {
  it("lists Caja, Pedidos, Reportes and Configuración for the owner", () => {
    render(
      <MorePage
        session={owner}
        status={{ pendingOrders: 3, cash: { isOpen: true, openedAt: "2026-11-11T12:02:00Z", expectedCash: "100.00" } }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Más" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Caja abierta/ })).toHaveAttribute("href", "/dashboard/caja");
    expect(screen.getByText(/Efectivo esperado/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pedidos/ })).toHaveAttribute("href", "/dashboard/solicitudes");
    expect(screen.getByRole("link", { name: /Pedidos/ })).toHaveTextContent("3");
    expect(screen.getByRole("link", { name: /Reportes/ })).toHaveAttribute("href", "/dashboard/reports");
    expect(screen.getByRole("link", { name: /Configuración/ })).toHaveAttribute("href", "/dashboard/settings");
    expect(screen.getByText("Dueño de Tienda Local", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("the cashier sees no Configuración and no cash amounts", () => {
    render(
      <MorePage
        session={{ ...owner, role: "cashier", fullName: null, email: "luis@example.com" }}
        status={{ pendingOrders: null, cash: { isOpen: true, openedAt: null, expectedCash: "100.00" } }}
      />,
    );

    expect(screen.queryByRole("link", { name: /Configuración/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Efectivo esperado/)).not.toBeInTheDocument();
    expect(screen.getByText("Ventas y movimientos de stock")).toBeInTheDocument();
    expect(screen.getByText(/Cajero de Tienda Local/)).toBeInTheDocument();
  });

  it("explains a closed cash register by role", () => {
    const { unmount } = render(<MorePage session={owner} status={{ pendingOrders: 0, cash: { isOpen: false, openedAt: null, expectedCash: null } }} />);
    expect(screen.getByText("Ábrela para empezar a vender")).toBeInTheDocument();
    unmount();
    render(
      <MorePage
        session={{ ...owner, role: "cashier" }}
        status={{ pendingOrders: 0, cash: { isOpen: false, openedAt: null, expectedCash: null } }}
      />,
    );
    expect(screen.getByText("El dueño la abre para vender")).toBeInTheDocument();
  });
});
