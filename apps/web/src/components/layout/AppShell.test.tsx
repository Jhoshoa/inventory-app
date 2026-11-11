import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth/session";
import { AppShell } from "./AppShell";
import type { ShellStatus } from "./shellStatus";

let pathname = "/dashboard/products/labels";
const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push }),
}));

vi.mock("./ConnectionStrip", () => ({
  ConnectionStrip: () => null,
}));

const ownerSession: Session = {
  userId: "user-1",
  email: "owner@example.com",
  storeId: "store-1",
  storeName: "Mi tienda",
  fullName: "Rosa Quispe",
  role: "owner",
  trialExpiresAt: null,
  daysUntilTrialEnds: 9,
  subscriptionStatus: "trial",
  accessStatus: null,
};
const cashierSession: Session = { ...ownerSession, role: "cashier", email: "cashier@example.com", fullName: null };
const status: ShellStatus = {
  pendingOrders: 2,
  cash: { isOpen: true, openedAt: "2026-11-11T12:02:00Z", expectedCash: "862.00" },
};

function nav(name: "sidebar" | "rail" | "tabs") {
  const element = document.querySelector<HTMLElement>(`[data-nav="${name}"]`);
  if (!element) throw new Error(`nav ${name} not rendered`);
  return within(element);
}

function renderShell(session: Session = ownerSession, shellStatus: ShellStatus = status) {
  return render(
    <AppShell session={session} status={shellStatus}>
      <p>Content</p>
    </AppShell>,
  );
}

describe("AppShell", () => {
  beforeEach(() => {
    pathname = "/dashboard/products/labels";
    push.mockReset();
  });

  it("uses the new names in order in the sidebar", () => {
    renderShell();

    const links = nav("sidebar").getAllByRole("link");
    expect(links.map((link) => link.textContent?.replace(/\d+ sin responder$/, ""))).toEqual([
      "Inicio",
      "Vender",
      "Caja",
      "Productos",
      "Ventas",
      "Pedidos",
      "Reportes",
      "Configuración",
    ]);
    expect(nav("sidebar").getByRole("link", { name: "Caja" })).toHaveAttribute("href", "/dashboard/caja");
    expect(nav("sidebar").getByRole("link", { name: "Configuración" })).toHaveAttribute("href", "/dashboard/settings");
  });

  it("hides Configuración for the cashier everywhere", () => {
    renderShell(cashierSession);

    expect(nav("sidebar").queryByRole("link", { name: "Configuración" })).not.toBeInTheDocument();
    expect(nav("rail").queryByRole("link", { name: "Configuración" })).not.toBeInTheDocument();
    expect(nav("sidebar").getByRole("link", { name: "Productos" })).toHaveAttribute("href", "/dashboard/products");
  });

  it("marks the parent item active for child routes", () => {
    renderShell();

    expect(nav("sidebar").getByRole("link", { name: "Productos" })).toHaveAttribute("aria-current", "page");
    expect(nav("sidebar").getByRole("link", { name: "Inicio" })).not.toHaveAttribute("aria-current");
    expect(nav("tabs").getByRole("link", { name: "Productos" })).toHaveAttribute("aria-current", "page");
  });

  it("shows pending orders on Pedidos and on Más", () => {
    renderShell();

    expect(nav("sidebar").getByRole("link", { name: /Pedidos/ })).toHaveTextContent("2");
    expect(nav("tabs").getByRole("link", { name: /Más/ })).toHaveTextContent("2");
  });

  it("shows the cash card with the expected cash only to the owner", () => {
    const { unmount } = renderShell();
    expect(screen.getByText("Caja abierta")).toBeInTheDocument();
    expect(screen.getByText(/Efectivo esperado/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cerrar caja" })).toHaveAttribute("href", "/dashboard/caja");
    unmount();

    renderShell(cashierSession);
    expect(screen.getByText("Caja abierta")).toBeInTheDocument();
    expect(screen.queryByText(/Efectivo esperado/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Cerrar caja" })).not.toBeInTheDocument();
  });

  it("shows the store and plan in the sidebar", () => {
    renderShell();

    expect(screen.getByText("Mi tienda")).toBeInTheDocument();
    expect(screen.getByText("Plan Prueba · 9 días")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Nueva venta/ })).toHaveAttribute("href", "/dashboard/pos");
  });

  it("works without shell data when the API does not answer", () => {
    renderShell(ownerSession, { pendingOrders: null, cash: null });

    expect(screen.queryByText("Caja abierta")).not.toBeInTheDocument();
    expect(nav("tabs").getByRole("link", { name: "Más" })).toBeInTheDocument();
  });

  it("goes to Vender with F2", () => {
    pathname = "/dashboard";
    renderShell();

    fireEvent.keyDown(window, { key: "F2" });
    expect(push).toHaveBeenCalledWith("/dashboard/pos");
  });

  it("does not render the tab bar on the receipt print page", () => {
    pathname = "/dashboard/sales/sale-1/print";
    renderShell();

    expect(document.querySelector('[data-nav="tabs"]')).toBeNull();
  });
});
