import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectionStatus } from "@/lib/offline/useConnectionStatus";
import { ConnectionStrip } from "./ConnectionStrip";

const syncNow = vi.fn();
let status: ConnectionStatus;

vi.mock("@/lib/offline/useConnectionStatus", () => ({
  useConnectionStatus: () => status,
}));

vi.mock("./SyncConflictsDialog", () => ({
  SyncConflictsDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Ventas por revisar" /> : null),
}));

function base(overrides: Partial<ConnectionStatus> = {}): ConnectionStatus {
  return {
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    conflictCount: 0,
    syncNow,
    refreshCounts: vi.fn(),
    ...overrides,
  } as ConnectionStatus;
}

describe("ConnectionStrip", () => {
  beforeEach(() => {
    syncNow.mockReset();
  });

  it("does not show anything online with nothing pending", () => {
    status = base();
    const { container } = render(<ConnectionStrip />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offline: says how many sales are saved on this device", () => {
    status = base({ isOnline: false, pendingCount: 2 });
    render(<ConnectionStrip />);
    expect(screen.getByRole("status")).toHaveTextContent("Sin conexión · 2 ventas guardadas en este equipo");
  });

  it("singular when one sale is saved", () => {
    status = base({ isOnline: false, pendingCount: 1 });
    render(<ConnectionStrip />);
    expect(screen.getByRole("status")).toHaveTextContent("1 venta guardada en este equipo");
  });

  it("sales to review open the review sheet", () => {
    status = base({ conflictCount: 3 });
    render(<ConnectionStrip />);
    expect(screen.getByRole("alert")).toHaveTextContent("3 ventas por revisar");
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));
    expect(screen.getByRole("dialog", { name: "Ventas por revisar" })).toBeInTheDocument();
  });

  it("pending online sales can be sent now; while syncing it says so", () => {
    status = base({ pendingCount: 1 });
    const { rerender } = render(<ConnectionStrip />);
    fireEvent.click(screen.getByRole("button", { name: "Enviar ahora" }));
    expect(syncNow).toHaveBeenCalled();

    status = base({ pendingCount: 1, isSyncing: true });
    rerender(<ConnectionStrip />);
    expect(screen.getByRole("status")).toHaveTextContent("Sincronizando…");
    expect(screen.queryByRole("button", { name: "Enviar ahora" })).not.toBeInTheDocument();
  });
});
