import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StorefrontBoletaProvider } from "../boleta";
import { createStorefrontOrderAction } from "../requestActions";
import { DEFAULT_STOREFRONT_SETTINGS } from "../settings";
import type { PublicStorefront, PublicStorefrontProduct } from "../types";
import { BoletaBar } from "./BoletaDock";
import { boletaStoreOf, type CatalogPageData } from "./catalogData";
import { ListaCatalog } from "./Lista";
import { VitrinaCatalog } from "./Vitrina";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../requestActions", () => ({ createStorefrontOrderAction: vi.fn() }));

const product = (id: string, name: string, overrides: Partial<PublicStorefrontProduct> = {}): PublicStorefrontProduct => ({
  id,
  name,
  price: "8.00",
  unit: "unidad",
  photo_url: null,
  available: true,
  low_stock: false,
  category: "Lacteos",
  category_id: "c-lacteos",
  discount_type: null,
  discount_value: "0",
  effective_price: "8.00",
  ...overrides,
});

const MILK = product("p-milk", "Leche Pil 1l");
const CHEESE = product("p-cheese", "Queso Criollo", { price: "55.00", effective_price: "55.00", low_stock: true });
const BLEACH = product("p-bleach", "Lavandina 1l", { category: "Limpieza", category_id: "c-limpieza", available: false });
const BAG = product("p-bag", "Bolsa", { category: null, category_id: null });

const store: PublicStorefront = {
  name: "Tienda Local",
  tier: "standard",
  logo_url: null,
  banner_url: null,
  color_primary: null,
  color_secondary: null,
  description: "Almacen de barrio",
  whatsapp: "59170000000",
  payment_qr_url: "https://res.cloudinary.com/demo/qr.png",
  payment_instructions: "Paga con QR y manda el comprobante",
  timezone: "America/La_Paz",
  settings: {
    ...DEFAULT_STOREFRONT_SETTINGS,
    address: "Calle Sucre 123",
    hours: [...Array.from({ length: 6 }, () => ({ is_open: true, opens_at: "08:00", closes_at: "21:00" })), { is_open: false, opens_at: null, closes_at: null }],
  },
};

function pageData(overrides: Partial<CatalogPageData> = {}): CatalogPageData {
  return {
    slug: "tienda",
    store,
    categories: [
      { id: "c-lacteos", name: "Lacteos", product_count: 2 },
      { id: "c-limpieza", name: "Limpieza", product_count: 1 },
    ],
    productList: { items: [MILK, CHEESE, BLEACH, BAG], total: 4, limit: 24, offset: 0 },
    featured: { items: [CHEESE], source: "manual" },
    sort: "name",
    defaultSort: "name",
    offset: 0,
    pageSize: 24,
    ...overrides,
  };
}

function renderInStore(ui: React.ReactNode) {
  return render(<StorefrontBoletaProvider slug="tienda">{ui}</StorefrontBoletaProvider>);
}

describe("Plantilla Vitrina", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows the hero, the price stickers, the featured receipt and the info sections", () => {
    renderInStore(<VitrinaCatalog {...pageData()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Tienda Local" })).toBeInTheDocument();
    expect(screen.getByText("DESTACADOS")).toBeInTheDocument();
    expect(screen.getByText("LUN – SAB 08:00 – 21:00".toLowerCase(), { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText("ULTIMAS UNIDADES")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Agotado" })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Pide, paga con QR y listo." })).toBeInTheDocument();
    expect(screen.getByText("Paga con QR y manda el comprobante")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Visitanos o escribenos." })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Tu boleta de pedido" })).toBeInTheDocument();
  });

  it("hides the sections the store turned off", () => {
    renderInStore(
      <VitrinaCatalog
        {...pageData({ store: { ...store, settings: { ...store.settings, show_payment: false, show_contact: false } } })}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Pide, paga con QR y listo." })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Visitanos o escribenos." })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Como pagar" })).not.toBeInTheDocument();
  });

  it("adds a product and turns the button into a counter", async () => {
    const user = userEvent.setup();
    renderInStore(<VitrinaCatalog {...pageData()} />);

    await user.click(screen.getByRole("button", { name: "Agregar Leche Pil 1l a la boleta" }));
    // La tarjeta y la boleta lateral tienen su propio "+".
    await user.click(screen.getAllByRole("button", { name: "Agregar otro Leche Pil 1l" })[0]);

    const aside = screen.getByRole("complementary", { name: "Tu boleta de pedido" });
    expect(within(aside).getByText("2 × 8,00")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Quitar un Leche Pil 1l" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Quitar un Leche Pil 1l" })[0]);
    expect(screen.getByRole("button", { name: "Agregar Leche Pil 1l a la boleta" })).toBeInTheDocument();
  });
});

describe("Menu de categorias", () => {
  it("closes after picking a category", async () => {
    const user = userEvent.setup();
    renderInStore(<VitrinaCatalog {...pageData()} />);
    const menu = screen.getByText("Categorias", { selector: "summary" }).closest("details") as HTMLDetailsElement;

    await user.click(screen.getByText("Categorias", { selector: "summary" }));
    expect(menu.open).toBe(true);
    await user.click(within(menu).getByRole("link", { name: /Limpieza/ }));

    expect(menu.open).toBe(false);
  });
});

describe("Plantilla Lista de precios", () => {
  beforeEach(() => window.localStorage.clear());

  it("groups products by category, with uncategorized ones last", () => {
    renderInStore(<ListaCatalog {...pageData({ store: { ...store, settings: { ...store.settings, template: "lista" } } })} />);

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Lacteos", "Limpieza", "Otros"]);
    expect(screen.getByText("AGOT.")).toBeInTheDocument();
    expect(screen.getByText("ULTIMAS")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lacteos · 2" })).toHaveAttribute("href", "#cat-c-lacteos");
    expect(screen.getByText("PEDIDOS", { exact: false })).toBeInTheDocument();
  });

  it("adds with the round + button", async () => {
    const user = userEvent.setup();
    renderInStore(<ListaCatalog {...pageData()} />);

    await user.click(screen.getByRole("button", { name: "Agregar Queso Criollo al pedido" }));

    expect(screen.getByRole("button", { name: "Agregar otro Queso Criollo" })).toBeInTheDocument();
  });
});

describe("Boleta en el celular", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(createStorefrontOrderAction).mockReset();
  });

  it("sends the order and then offers WhatsApp with the server detail and the QR", async () => {
    vi.mocked(createStorefrontOrderAction).mockResolvedValue({
      ok: true,
      message: "Listo",
      order: {
        id: "o-1",
        items: [{ product_id: "p-milk", product_name: "Leche Pil 1l", unit: "unidad", quantity: 2, unit_price: "8.00", line_total: "16.00" }],
        total: "16.00",
        delivery_method: "pickup",
        created_at: "2026-11-10T12:00:00Z",
      },
    });
    const user = userEvent.setup();
    renderInStore(
      <>
        <VitrinaCatalog {...pageData()} />
        <BoletaBar store={boletaStoreOf("tienda", store)} variant="vitrina" themeVars={{}} fontClassName="" />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Agregar Leche Pil 1l a la boleta" }));
    // La tarjeta y la boleta lateral tienen su propio "+".
    await user.click(screen.getAllByRole("button", { name: "Agregar otro Leche Pil 1l" })[0]);
    expect(screen.getByText("TU BOLETA · 2 items")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ver boleta →" }));

    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText("ASI LLEGA A LA TIENDA:")).toBeInTheDocument();
    await user.type(within(sheet).getByLabelText("Tu nombre"), "Ana");
    await user.type(within(sheet).getByPlaceholderText("Tu numero"), "71234567");
    await user.click(within(sheet).getByRole("button", { name: /Enviar pedido/ }));

    expect(vi.mocked(createStorefrontOrderAction).mock.calls[0][1]).toEqual([{ product_id: "p-milk", quantity: 2 }]);
    expect(await within(sheet).findByText("MONTO A PAGAR")).toBeInTheDocument();
    expect(within(sheet).getByRole("img", { name: "QR de pago de la tienda" })).toBeInTheDocument();
    const whatsapp = within(sheet).getByRole("link", { name: /Enviar pedido por WhatsApp/ });
    expect(decodeURIComponent(whatsapp.getAttribute("href") ?? "")).toContain("2 unidad x Leche Pil 1l");
    expect(screen.queryByText(/TU BOLETA ·/)).not.toBeInTheDocument();
  });

  it("marks products the store no longer has and blocks sending until they are removed", async () => {
    vi.mocked(createStorefrontOrderAction).mockResolvedValue({
      ok: false,
      message: "Algunos productos de tu boleta ya no estan disponibles.",
      fieldErrors: {},
      unavailableProductIds: ["p-cheese"],
    });
    const user = userEvent.setup();
    renderInStore(
      <>
        <VitrinaCatalog {...pageData()} />
        <BoletaBar store={boletaStoreOf("tienda", store)} variant="lista" themeVars={{}} fontClassName="" />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Agregar Leche Pil 1l a la boleta" }));
    await user.click(screen.getByRole("button", { name: "Agregar Queso Criollo a la boleta" }));
    await user.click(screen.getByRole("button", { name: "Ver pedido →" }));
    const sheet = screen.getByRole("dialog");
    await user.type(within(sheet).getByLabelText("Tu nombre"), "Ana");
    await user.type(within(sheet).getByPlaceholderText("Tu numero"), "71234567");
    await user.click(within(sheet).getByRole("button", { name: /Enviar pedido/ }));

    expect(await within(sheet).findByText("Ya no esta disponible")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: /Enviar pedido/ })).toBeDisabled();
    await user.click(within(sheet).getByRole("button", { name: "Quitar Queso Criollo" }));
    expect(within(sheet).getByRole("button", { name: /Enviar pedido/ })).toBeEnabled();
  });
});
