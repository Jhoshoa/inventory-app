import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductBatches } from "./ProductBatches";
import type { ProductBatch } from "../types";

vi.mock("../actions", () => ({ adjustStockAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const batches: ProductBatch[] = [
  {
    id: "batch-1",
    product_id: "product-1",
    expires_on: "2026-11-08",
    alert_days: 5,
    quantity_initial: 4,
    quantity_remaining: 2,
    created_at: "2026-11-01T00:00:00Z",
    days_left: -2,
    status: "expired",
    product_name: null,
    product_unit: null,
  },
  {
    id: "batch-2",
    product_id: "product-1",
    expires_on: "2026-11-30",
    alert_days: 1,
    quantity_initial: 6,
    quantity_remaining: 6,
    created_at: "2026-11-02T00:00:00Z",
    days_left: 20,
    status: "ok",
    product_name: null,
    product_unit: null,
  },
];

describe("ProductBatches", () => {
  it("lists batches with their state and lets the owner remove them", () => {
    render(
      <ProductBatches
        productId="product-1"
        productName="Yogur"
        unit="unidad"
        stock={10}
        batches={batches}
        untrackedQuantity={2}
        canRemove
      />,
    );

    expect(screen.getByText("08/11/2026")).toBeInTheDocument();
    expect(screen.getByText("Vencido")).toBeInTheDocument();
    expect(screen.getByText(/Vencio hace 2 dias/)).toBeInTheDocument();
    expect(screen.getByText(/aviso 1 dia antes/)).toBeInTheDocument();
    expect(screen.getByText("Sin fecha de vencimiento: 2 unidad")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirar vencido" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirar" })).toBeInTheDocument();
  });

  it("is read only for cashiers", () => {
    render(
      <ProductBatches
        productId="product-1"
        productName="Yogur"
        unit="unidad"
        stock={8}
        batches={batches}
        untrackedQuantity={0}
        canRemove={false}
      />,
    );

    expect(screen.getByText("Vigente")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Retirar/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Sin fecha de vencimiento/)).not.toBeInTheDocument();
  });

  it("explains how to start tracking expiry when there are no batches", () => {
    render(
      <ProductBatches productId="p" productName="Arroz" unit="kg" stock={3} batches={[]} untrackedQuantity={3} canRemove />,
    );
    expect(screen.getByText(/no tiene lotes con vencimiento/)).toHaveTextContent("Al agregar stock");
  });
});
