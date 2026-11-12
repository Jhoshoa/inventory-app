import Link from "next/link";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveProductCategoryAction } from "@/features/product-categories/actions";
import type { ProductCategory } from "@/features/product-categories/types";
import { saveStoreLocationAction } from "@/features/store-locations/actions";
import type { StoreLocation } from "@/features/store-locations/types";
import { createProductAction, updateProductAction } from "../actions";
import type { Product } from "../types";
import { ProductForm } from "./ProductForm";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard/products/new",
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("../actions", () => ({ createProductAction: vi.fn(), updateProductAction: vi.fn() }));
vi.mock("@/features/product-categories/actions", () => ({ saveProductCategoryAction: vi.fn() }));
vi.mock("@/features/store-locations/actions", () => ({ saveStoreLocationAction: vi.fn(), setProductLocationsAction: vi.fn() }));
vi.mock("../qr", () => ({
  generateQrSvg: vi.fn(async () => "<svg></svg>"),
  svgToDataUri: () => "data:image/svg+xml,",
  toQrFilename: () => "qr.svg",
}));

const categories: ProductCategory[] = [
  { id: "c-1", name: "Lácteos", sku_prefix: "LAC", next_sku_number: 5, is_active: true },
  { id: "c-2", name: "Golosinas", sku_prefix: "GOL", next_sku_number: 1, is_active: false },
];
const locations: StoreLocation[] = [
  { id: "l-1", zone: "Heladera", shelf: null, level: null, label: "Heladera", product_count: 2 },
  { id: "l-2", zone: "Depósito", shelf: null, level: null, label: "Depósito", product_count: 0 },
];
const policy = { percentage: { allowed: true, max: 15 }, fixed: { allowed: false, max: 0 } };

const product: Product = {
  id: "p-1",
  name: "Yogur Frutilla",
  price: "6.50",
  stock: 11,
  category_id: "c-1",
  category: "Lácteos",
  qr_code: "7751234",
  photo_url: null,
  min_stock: 3,
  unit: "unidad",
  sku: "LAC000004",
  cost_price: "4.20",
  is_active: true,
  version: 2,
  discount_type: "percentage",
  discount_value: "10.00",
  discount_ends_at: null,
  effective_price: "5.85",
  locations: [{ id: "l-1", label: "Heladera", zone: "Heladera", shelf: null, level: null, kind: "display" }],
};

function renderCreate() {
  return render(<ProductForm mode="create" categories={categories} storeLocations={locations} policy={policy} defaultAlertDays={7} />);
}

function type(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("ProductForm", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(createProductAction).mockReset();
    vi.mocked(updateProductAction).mockReset();
    vi.mocked(saveProductCategoryAction).mockReset();
    vi.mocked(saveStoreLocationAction).mockReset();
  });

  it("validates before sending, counts the errors and focuses the first one", async () => {
    renderCreate();
    fireEvent.submit(document.getElementById("product-form")!);

    expect(screen.getByRole("alert")).toHaveTextContent("Revisa 2 campos antes de guardar.");
    expect(screen.getByText("Escribe el nombre del producto")).toBeInTheDocument();
    expect(screen.getByText("Escribe el precio de venta")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Nombre")).toHaveFocus());
    expect(createProductAction).not.toHaveBeenCalled();
  });

  it("explains the automatic SKU, the code it will get and the margin", () => {
    renderCreate();
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "c-1" } });
    expect(screen.getByText("LAC000005")).toBeInTheDocument();
    expect(screen.getByText("Vacío: se crea uno a partir del SKU (QR-LAC000005).")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Golosinas/ })).not.toBeInTheDocument();

    type("Precio de venta", "18,50");
    type(/^Costo/, "12");
    expect(screen.getByText(/Ganas Bs\s?6,50 por unidad \(35%\)\./)).toBeInTheDocument();
    type(/^Costo/, "20");
    expect(screen.getByText(/Pierdes Bs\s?1,50 por unidad/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Escribir otro" }));
    expect(screen.getByLabelText(/^SKU/)).toBeInTheDocument();
  });

  it("discounts follow the store policy and show the final price", () => {
    renderCreate();
    expect(screen.getByRole("radio", { name: "Bs" })).toBeDisabled();
    expect(screen.getByText(/La tienda no permite rebajas en Bs/)).toBeInTheDocument();
    type("Precio de venta", "6,50");
    fireEvent.click(screen.getByRole("radio", { name: "%" }));
    type("Porcentaje", "10");
    expect(screen.getByText(/Bs\s?5,85/, { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/límite de la tienda: 15%/)).toBeInTheDocument();

    type("Porcentaje", "20");
    fireEvent.submit(document.getElementById("product-form")!);
    expect(screen.getByText("El máximo de la tienda es 15%")).toBeInTheDocument();
  });

  it("expiry uses the store alert when left empty and explains the lot", () => {
    renderCreate();
    type("Stock inicial", "24");
    type(/^Vence el/, "2026-12-02");
    expect(screen.getByLabelText("Avisar días antes")).toHaveAttribute("placeholder", "7");
    expect(screen.getByText("Vacío: 7 días (aviso de la tienda).")).toBeInTheDocument();
    expect(screen.getByText(/Las 24 unidades entran como un lote que vence el 02\/12\./)).toBeInTheDocument();
  });

  it("creates a category without leaving and selects it", async () => {
    vi.mocked(saveProductCategoryAction).mockResolvedValue({
      ok: true,
      category: { id: "c-9", name: "Pan integral", sku_prefix: "PAN", next_sku_number: 1, is_active: true },
      fieldErrors: {},
    });
    renderCreate();
    type("Nombre", "Pan integral de molde");
    fireEvent.click(screen.getByRole("button", { name: "+ Nueva" }));
    const dialog = screen.getByRole("dialog", { name: "Nueva categoría" });
    expect(within(dialog).getByText("Lo que escribiste en el producto no se pierde.")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Nombre"), { target: { value: "Pan integral" } });
    expect(within(dialog).getByLabelText("Prefijo del SKU")).toHaveValue("PAN");
    fireEvent.click(within(dialog).getByRole("button", { name: "Crear y usar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Categoría")).toHaveValue("c-9");
    expect(screen.getByText("PAN000001")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Pan integral de molde");
    expect(createProductAction).not.toHaveBeenCalled();
  });

  it("marks places, and a new place created from the form stays marked", async () => {
    vi.mocked(saveStoreLocationAction).mockResolvedValue({
      ok: true,
      location: { id: "l-9", zone: "Pasillo 4", shelf: "Estante A", level: "2", label: "Pasillo 4 · Estante A · 2", product_count: 0 },
      fieldErrors: {},
    });
    renderCreate();
    fireEvent.change(screen.getByRole("combobox", { name: /Dónde está/ }), { target: { value: "l-1" } });
    expect(screen.getByRole("button", { name: /Heladera, Exhibición/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Nuevo lugar" }));
    const dialog = screen.getByRole("dialog", { name: "Nuevo lugar en la tienda" });
    fireEvent.change(within(dialog).getByLabelText("Zona"), { target: { value: "Pasillo 4" } });
    fireEvent.change(within(dialog).getByLabelText(/Estante/), { target: { value: "Estante A" } });
    fireEvent.change(within(dialog).getByLabelText(/Nivel/), { target: { value: "2" } });
    expect(within(dialog).getByText("Pasillo 4 · Estante A · 2")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Crear y marcar" }));

    await waitFor(() => expect(screen.getByRole("button", { name: /Pasillo 4 · Estante A · 2, Depósito/ })).toBeInTheDocument());
    const hidden = document.querySelector<HTMLInputElement>('input[name="locations"]')!;
    expect(JSON.parse(hidden.value)).toEqual([
      { location_id: "l-1", kind: "display" },
      { location_id: "l-9", kind: "storage" },
    ]);
    expect(createProductAction).not.toHaveBeenCalled();
  });

  it("sends a valid product and shows API errors on their field", async () => {
    vi.mocked(createProductAction).mockResolvedValue({
      ok: false,
      fieldErrors: { qr_code: "El código escaneable ya está en uso por otro producto." },
      values: { ...(await import("../schemas")).productToFormValues(), name: "Leche", price: "7,50", stock: "3", qr_code: "775" },
    });
    renderCreate();
    type("Nombre", "Leche");
    type("Precio de venta", "7,50");
    type("Stock inicial", "3");
    type(/^Código para escanear/, "775");
    await act(async () => {
      fireEvent.submit(document.getElementById("product-form")!);
    });
    await waitFor(() => expect(createProductAction).toHaveBeenCalled());
    const formData = vi.mocked(createProductAction).mock.calls[0][1];
    expect(formData.get("price")).toBe("7,50");
    expect(await screen.findByText("El código escaneable ya está en uso por otro producto.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Código para escanear/)).toHaveValue("775");
  });

  it("shows what it looks like when selling", () => {
    renderCreate();
    const preview = screen.getByRole("region", { name: "Así se ve al vender" });
    expect(within(preview).getByText("Nombre del producto")).toBeInTheDocument();
    type("Nombre", "Yogur Frutilla");
    type("Precio de venta", "6,50");
    type("Stock inicial", "11");
    expect(within(preview).getByText("Yogur Frutilla")).toBeInTheDocument();
    expect(within(preview).getByText("11 u.")).toBeInTheDocument();
    expect(within(preview).getByText(/Bs\s?6,50/)).toBeInTheDocument();
  });

  it("edit shows the current values with comma, stock read-only and the lots", () => {
    render(
      <ProductForm
        mode="edit"
        product={product}
        categories={categories}
        storeLocations={locations}
        policy={policy}
        batches={{
          items: [
            { id: "b-1", product_id: "p-1", expires_on: "2026-11-13", alert_days: 5, quantity_initial: 8, quantity_remaining: 8, created_at: "", days_left: 1, status: "expiring", product_name: null, product_unit: null },
            { id: "b-2", product_id: "p-1", expires_on: "2026-12-20", alert_days: 5, quantity_initial: 3, quantity_remaining: 3, created_at: "", days_left: 38, status: "ok", product_name: null, product_unit: null },
          ],
          untracked_quantity: 0,
          today: "2026-11-12",
        }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Editar producto" })).toBeInTheDocument();
    expect(screen.getByLabelText("Precio de venta")).toHaveValue("6,50");
    expect(screen.getByLabelText(/^Costo/)).toHaveValue("4,20");
    expect(screen.getByLabelText("Porcentaje")).toHaveValue("10");
    expect(screen.queryByLabelText("Stock inicial")).not.toBeInTheDocument();
    expect(screen.getByText("11 u.", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("2 lotes · próximo vence 13/11")).toBeInTheDocument();
    expect(screen.getByLabelText(/^SKU/)).toHaveValue("LAC000004");
    expect(screen.getAllByText("Heladera").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Ver QR" })).toBeInTheDocument();
  });

  it("Cancelar with changes asks before leaving", () => {
    render(<ProductForm mode="edit" product={product} categories={categories} storeLocations={locations} />);
    const cancel = screen.getAllByRole("button", { name: "Cancelar" })[0];
    fireEvent.click(cancel);
    expect(push).toHaveBeenCalledWith("/dashboard/products/p-1");
    push.mockReset();

    type("Nombre", "Yogur Frutilla grande");
    fireEvent.click(cancel);
    const dialog = screen.getByRole("dialog", { name: "¿Salir sin guardar?" });
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Seguir editando" }));
    expect(screen.getByLabelText("Nombre")).toHaveValue("Yogur Frutilla grande");

    fireEvent.click(cancel);
    fireEvent.click(within(screen.getByRole("dialog", { name: "¿Salir sin guardar?" })).getByRole("button", { name: "Salir sin guardar" }));
    expect(push).toHaveBeenCalledWith("/dashboard/products/p-1");
  });

  it("links in the app also ask when there are changes", () => {
    render(
      <>
        <Link href="/dashboard/sales">Ventas</Link>
        <ProductForm mode="create" categories={categories} storeLocations={locations} />
      </>,
    );
    type("Nombre", "Algo");
    fireEvent.click(screen.getByRole("link", { name: "Ventas" }));
    expect(screen.getByRole("dialog", { name: "¿Salir sin guardar?" })).toBeInTheDocument();
  });
});
