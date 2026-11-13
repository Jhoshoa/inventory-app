import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Product, ProductBatch, StockMovement } from "../types";
import { ProductDetail } from "./ProductDetail";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/products/p-1",
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../actions", () => ({ adjustStockAction: vi.fn(), deleteProductAction: vi.fn() }));
vi.mock("@/features/store-locations/actions", () => ({ setProductLocationsAction: vi.fn(), saveStoreLocationAction: vi.fn() }));
vi.mock("../qr", () => ({ generateQrSvg: vi.fn(async () => "<svg></svg>"), svgToDataUri: () => "data:", toQrFilename: () => "qr" }));

const product: Product = {
  id: "p-1",
  name: "Yogur Frutilla",
  price: "6.50",
  stock: 11,
  category_id: "c-1",
  category: "Lácteos",
  qr_code: "QR-LAC000004",
  photo_url: null,
  min_stock: 4,
  unit: "unidad",
  sku: "LAC000004",
  cost_price: "4.20",
  is_active: true,
  version: 3,
  discount_type: "percentage",
  discount_value: "10.00",
  discount_ends_at: "2099-11-14T23:59:59.999Z",
  effective_price: "5.85",
  locations: [
    { id: "l-1", label: "Pasillo 2 · B · 3", zone: "Pasillo 2", shelf: "B", level: "3", kind: "display" },
    { id: "l-2", label: "Depósito", zone: "Depósito", shelf: null, level: null, kind: "storage" },
  ],
};

const lot = (overrides: Partial<ProductBatch>): ProductBatch => ({
  id: "b-1",
  product_id: "p-1",
  expires_on: "2026-11-13",
  alert_days: 5,
  quantity_initial: 8,
  quantity_remaining: 8,
  created_at: "",
  days_left: 3,
  status: "expiring",
  product_name: null,
  product_unit: null,
  ...overrides,
});

const batches = {
  items: [lot({}), lot({ id: "b-2", expires_on: "2026-12-20", quantity_initial: 5, quantity_remaining: 3, days_left: 40, status: "ok" }), lot({ id: "b-3", quantity_remaining: 0, status: "depleted" })],
  untracked_quantity: 0,
};

const movements: StockMovement[] = [
  { id: "m-1", product_id: "p-1", sale_id: null, movement_type: "manual_adjustment", quantity_delta: -2, stock_after: 11, reason: "Envase roto", device_id: null, created_at: "2026-11-09T12:00:00Z" },
];

function renderOwner() {
  return render(
    <ProductDetail product={product} role="owner" batches={batches} movements={movements} storeLocations={[]} storefrontEnabled defaultAlertDays={7} />,
  );
}

describe("ProductDetail", () => {
  it("shows price with discount, cost and margin, stock and next expiry", () => {
    renderOwner();
    expect(screen.getByRole("heading", { name: "Yogur Frutilla", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("En el catálogo")).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Resumen" });
    expect(within(summary).getByText(/Bs\s?5,85/)).toBeInTheDocument();
    expect(within(summary).getByText(/−10% hasta 14\/11/)).toBeInTheDocument();
    expect(within(summary).getByText(/Bs\s?4,20/)).toBeInTheDocument();
    expect(within(summary).getByText(/Ganas Bs\s?1,65 con descuento/)).toBeInTheDocument();
    expect(within(summary).getByText("11 u.")).toBeInTheDocument();
    expect(within(summary).getByText("Avisa si baja de 4", { exact: false })).toBeInTheDocument();
    expect(within(summary).getByText("13/11")).toBeInTheDocument();
    expect(within(summary).getByText("8 u. en 3 días")).toBeInTheDocument();
  });

  it("lists live lots only and Retirar opens Descontar with that lot", () => {
    renderOwner();
    const lots = screen.getByRole("region", { name: "Lotes y vencimientos" });
    expect(within(lots).getByText("Sale primero el que vence antes · sin fecha: 0 u.")).toBeInTheDocument();
    expect(within(lots).getAllByRole("button", { name: /Retirar lote/ })).toHaveLength(4);
    fireEvent.click(within(lots).getAllByRole("button", { name: "Retirar lote que vence el 20/12/2026" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Ajustar stock" });
    expect(within(dialog).getByRole("radio", { name: "Descontar" })).toBeChecked();
    expect(within(dialog).getByLabelText("Cantidad que sale")).toHaveValue("3");
  });

  it("shows Dónde está with kinds and the latest movements", () => {
    renderOwner();
    const places = screen.getByRole("region", { name: "Dónde está" });
    expect(within(places).getByText("Pasillo 2 · B · 3")).toBeInTheDocument();
    expect(within(places).getByText("Exhibición")).toBeInTheDocument();
    expect(within(places).getByRole("button", { name: "Cambiar" })).toBeInTheDocument();
    const moves = screen.getByRole("region", { name: "Movimientos" });
    expect(within(moves).getByText(/Ajuste: Envase roto/)).toBeInTheDocument();
    expect(within(moves).getByText("→ 11", { exact: false })).toBeInTheDocument();
    expect(within(moves).getByRole("link", { name: "Ver todos" })).toHaveAttribute(
      "href",
      "/dashboard/reports/stock-movements?product_id=p-1",
    );
  });

  it("the owner can duplicate and delete from ⋯", () => {
    renderOwner();
    fireEvent.click(screen.getAllByRole("button", { name: "Más acciones de Yogur Frutilla" })[0]);
    expect(screen.getByRole("menuitem", { name: "Duplicar" })).toHaveAttribute("href", "/dashboard/products/new?duplicar=p-1");
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar…" }));
    expect(screen.getByRole("dialog", { name: "¿Eliminar Yogur Frutilla?" })).toBeInTheDocument();
  });

  it("the cashier sees no cost or actions, only Ver QR", () => {
    render(<ProductDetail product={product} role="cashier" batches={batches} movements={movements} />);
    expect(screen.queryByText("Costo y margen")).not.toBeInTheDocument();
    expect(screen.queryByText(/Ganas/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajustar stock" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Retirar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Más acciones/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cambiar" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ver QR" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Pasillo 2 · B · 3")).toBeInTheDocument();
  });

  it("without a cost the owner is invited to add it", () => {
    render(<ProductDetail product={{ ...product, cost_price: null, discount_type: null }} role="owner" />);
    expect(screen.getByRole("link", { name: "Agregar el costo" })).toHaveAttribute("href", "/dashboard/products/p-1/edit");
    expect(screen.queryByText("En el catálogo")).not.toBeInTheDocument();
  });
});
