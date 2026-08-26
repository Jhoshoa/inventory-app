import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOfflineDb } from "@/lib/offline/db";
import { SyncConflictsDialog } from "./SyncConflictsDialog";

async function seedConflictedSale() {
  const db = getOfflineDb();
  await db.products.put({
    id: "product-1",
    name: "Arroz",
    price: "10.00",
    stock: 2,
    unit: "unidad",
    qr_code: null,
    discount_type: null,
    discount_value: "0",
    effective_price: "10.00",
    deleted: false,
    serverUpdatedAt: new Date().toISOString(),
  });
  await db.pendingSales.add({
    id: "sale-1",
    items: [{ product_id: "product-1", product_name: "Arroz", quantity: 3, unit_price: "10.00" }],
    payment_method: "efectivo",
    customer_name: null,
    discount_type: null,
    discount_value: "0",
    discount_source_override: null,
    totalEstimate: "30.00",
    createdAt: "2026-08-20T10:00:00.000Z",
    status: "conflict",
    errorMessage: "Stock insuficiente para Arroz: 2 < 3",
  });
}

beforeEach(async () => {
  const db = getOfflineDb();
  await db.products.clear();
  await db.pendingSales.clear();
  await db.meta.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("SyncConflictsDialog", () => {
  it("shows an empty state when there are no conflicted sales", async () => {
    render(<SyncConflictsDialog open onOpenChange={vi.fn()} />);

    expect(await screen.findByText("No hay ventas pendientes de revision")).toBeInTheDocument();
  });

  it("lists a conflicted sale with its error and lets the user discard it, restoring stock", async () => {
    await seedConflictedSale();
    const user = userEvent.setup();
    const onResolved = vi.fn();
    render(<SyncConflictsDialog open onOpenChange={vi.fn()} onResolved={onResolved} />);

    expect(await screen.findByText(/Arroz x3/)).toBeInTheDocument();
    expect(screen.getByText(/Stock insuficiente/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Descartar" }));
    const confirmDialog = screen.getByRole("dialog", { name: "Descartar venta" });
    await user.click(within(confirmDialog).getByRole("button", { name: "Descartar" }));

    await waitFor(() => expect(screen.getByText("No hay ventas pendientes de revision")).toBeInTheDocument());
    expect(onResolved).toHaveBeenCalled();

    const db = getOfflineDb();
    expect(await db.pendingSales.get("sale-1")).toBeUndefined();
    expect((await db.products.get("product-1"))?.stock).toBe(5);
  });

  it("retries a conflicted sale and shows the outcome", async () => {
    await seedConflictedSale();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              client_change_id: "sale-1",
              entity: "sale",
              operation: "create",
              entity_id: "sale-1",
              status: "accepted",
              server_version: 1,
              server_updated_at: new Date().toISOString(),
              error: null,
            },
          ],
          server_time: new Date().toISOString(),
        }),
      }),
    );
    const user = userEvent.setup();
    render(<SyncConflictsDialog open onOpenChange={vi.fn()} />);

    await screen.findByText(/Arroz x3/);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(screen.getByText("No hay ventas pendientes de revision")).toBeInTheDocument());
  });
});
