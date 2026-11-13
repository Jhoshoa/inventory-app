import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sale } from "@/features/sales/types";
import { updateStorefrontRequestStatusAction } from "@/features/storefront-requests/actions";
import { createSaleAction } from "../actions";
import { saveOrderForPos } from "../order";
import type { PosProduct } from "../types";
import { PosScreen } from "./PosScreen";

const connection = vi.hoisted(() => ({ isOnline: true, pendingCount: 0 }));
const offline = vi.hoisted(() => ({ products: [] as Array<Record<string, unknown>> }));
const queueSale = vi.hoisted(() => vi.fn());

vi.mock("../actions", () => ({ createSaleAction: vi.fn() }));
vi.mock("@/features/storefront-requests/actions", () => ({ updateStorefrontRequestStatusAction: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/lib/offline/useConnectionStatus", () => ({
  useConnectionStatus: () => ({
    isOnline: connection.isOnline,
    isSyncing: false,
    pendingCount: connection.pendingCount,
    conflictCount: 0,
    lastSyncedAt: null,
    syncNow: vi.fn(),
    refreshCounts: vi.fn(async () => undefined),
  }),
}));
vi.mock("@/lib/offline/syncEngine", () => ({ queueSale, isDiscountExpired: () => false }));
vi.mock("@/lib/offline/db", () => ({
  getOfflineDb: () => ({
    products: {
      where: () => ({ equals: (code: string) => ({ first: async () => offline.products.find((product) => product.qr_code === code) }) }),
      filter: (predicate: (product: Record<string, unknown>) => boolean) => ({
        limit: () => ({ toArray: async () => offline.products.filter(predicate) }),
      }),
      bulkGet: async (ids: string[]) => ids.map((id) => offline.products.find((product) => product.id === id)),
    },
  }),
}));

const coca: PosProduct = {
  id: "p-1",
  name: "Coca Cola 2l",
  price: "14.00",
  stock: 2,
  unit: "unidad",
  qr_code: "7751234",
  discount_type: null,
  discount_value: "0",
  effective_price: "14.00",
  locations: [{ label: "Heladera", kind: "display" }],
};
const pan: PosProduct = { ...coca, id: "p-2", name: "Pan de batalla", price: "1.00", effective_price: "1.00", qr_code: null, stock: 0 };
const policy = {
  allow_percentage_discount: true,
  max_percentage_discount: "15",
  allow_manual_discount: false,
  max_manual_discount_amount: "0",
  allow_cashier_discount_override: false,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderScreen(topProductIds: string[] | null = null) {
  return render(<PosScreen policy={policy} storeName="Tienda Local" sellerName="Luis" topProductIds={topProductIds} />);
}

async function scan(code: string) {
  const input = screen.getByRole("searchbox");
  fireEvent.change(input, { target: { value: code } });
  fireEvent.keyDown(input, { key: "Enter" });
}

describe("PosScreen", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    connection.isOnline = true;
    connection.pendingCount = 0;
    offline.products = [];
    queueSale.mockReset();
    vi.mocked(createSaleAction).mockReset();
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/products/qr/7751234")) return json(coca);
      if (url.startsWith("/api/products/qr/")) return json({ detail: "no" }, 404);
      if (url.startsWith("/api/products/pos")) return json({ items: [coca, pan], total: 2, limit: 20, offset: 0 });
      return json({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("a scanned code goes into the sale, with undo", async () => {
    renderScreen();
    await scan("7751234");
    const sale = await screen.findByRole("list", { name: "Productos de la venta" });
    expect(within(sale).getByText("Coca Cola 2l")).toBeInTheDocument();
    expect(screen.getByText(/Agregado:/)).toHaveTextContent("Agregado: Coca Cola 2l");
    expect(screen.getByRole("searchbox")).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(screen.getByText("Todavía no hay productos")).toBeInTheDocument();
  });

  it("an unknown code says so", async () => {
    renderScreen();
    await scan("999999");
    expect(await screen.findByRole("alert")).toHaveTextContent('No hay producto con el código "999999".');
  });

  it("search results show place and stock, and products without stock cannot be added", async () => {
    renderScreen();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "coca" } });
    const results = await screen.findByRole("list", { name: "Resultados" });
    expect(within(results).getAllByText("Heladera").length).toBeGreaterThan(0);
    expect(within(results).getByText("Stock 2")).toBeInTheDocument();
    expect(within(results).getByRole("button", { name: /Pan de batalla, sin stock/ })).toBeDisabled();
    fireEvent.click(within(results).getByRole("button", { name: /Coca Cola 2l, agregar/ }));
    expect(within(screen.getByRole("list", { name: "Productos de la venta" })).getByText("Coca Cola 2l")).toBeInTheDocument();
  });

  it("quantity stops at the stock", async () => {
    renderScreen();
    await scan("7751234");
    await screen.findByRole("list", { name: "Productos de la venta" });
    fireEvent.click(screen.getByRole("button", { name: "Uno más de Coca Cola 2l" }));
    expect(screen.getByLabelText("Cantidad de Coca Cola 2l")).toHaveValue("2");
    expect(screen.getByRole("button", { name: "Uno más de Coca Cola 2l" })).toBeDisabled();
  });

  it("cash: change, then the sale is registered and shown without leaving Vender", async () => {
    const sale: Sale = {
      id: "b07038f2-0000-0000-0000-000000000000",
      items: [],
      subtotal: "14.00",
      discount_type: null,
      discount_value: "0",
      discount_amount: "0",
      total: "14.00",
      payment_method: "efectivo",
      status: "completed",
      business_day_id: null,
      business_date: null,
      created_by_user_id: "u-1",
      created_by_name: "Luis",
      created_at: "2026-11-12T15:47:00Z",
      voided_at: null,
      void_reason: null,
    };
    vi.mocked(createSaleAction).mockResolvedValue({ ok: true, fieldErrors: {}, sale });
    renderScreen();
    await scan("7751234");
    await screen.findByRole("list", { name: "Productos de la venta" });

    fireEvent.change(screen.getByLabelText(/Recibido en efectivo/), { target: { value: "20" } });
    expect(screen.getByText(/Cambio/).closest("p")).toHaveTextContent(/Cambio\s*Bs\s?6,00/);
    fireEvent.change(screen.getByLabelText(/Recibido en efectivo/), { target: { value: "10" } });
    expect(screen.getByText(/Falta Bs\s?4,00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "50" }));

    fireEvent.click(screen.getByRole("button", { name: /Confirmar venta · Bs\s?14,00/ }));
    expect(await screen.findByRole("heading", { name: "Venta registrada" })).toBeInTheDocument();
    expect(screen.getByText(/Venta b07038f2 · 11:47 · Efectivo · Luis/)).toBeInTheDocument();
    expect(screen.getByText(/Dar de cambio/).nextElementSibling).toHaveTextContent(/Bs\s?36,00/);
    expect(screen.getByRole("link", { name: /Imprimir recibo/ })).toHaveAttribute("href", `/dashboard/sales/${sale.id}/print`);
    expect(screen.getByRole("link", { name: /Enviar por WhatsApp/ }).getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\?text=/);
    const formData = vi.mocked(createSaleAction).mock.calls[0][1];
    expect(formData.get("payment_method")).toBe("efectivo");
    expect(JSON.parse(String(formData.get("items")))[0].quantity).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Nueva venta" }));
    expect(screen.getByText("Todavía no hay productos")).toBeInTheDocument();
  });

  it("a manual discount over the limit is stopped before sending", async () => {
    renderScreen();
    await scan("7751234");
    await screen.findByRole("list", { name: "Productos de la venta" });
    fireEvent.click(screen.getByRole("button", { name: "% (hasta 15%)" }));
    fireEvent.change(screen.getByLabelText("Porcentaje de descuento"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar venta/ }));
    expect(screen.getByText("El máximo es 15%")).toBeInTheDocument();
    expect(createSaleAction).not.toHaveBeenCalled();
  });

  it("when the stock changed, the sale shows it with Ajustar a N", async () => {
    vi.mocked(createSaleAction).mockResolvedValue({
      ok: false,
      fieldErrors: {},
      message: "El stock cambió",
      refreshedProducts: [{ ...coca, stock: 1 }],
    });
    renderScreen();
    await scan("7751234");
    await screen.findByRole("list", { name: "Productos de la venta" });
    fireEvent.click(screen.getByRole("button", { name: "Uno más de Coca Cola 2l" }));
    fireEvent.click(screen.getByRole("button", { name: /Confirmar venta/ }));
    expect(await screen.findByText("El stock cambió: quedan 1 y llevas 2.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ajustar a 1" }));
    expect(screen.getByLabelText("Cantidad de Coca Cola 2l")).toHaveValue("1");
  });

  it("offline, it searches on the device and keeps the sale for later", async () => {
    connection.isOnline = false;
    connection.pendingCount = 2;
    offline.products = [{ ...coca, deleted: false, serverUpdatedAt: "" }];
    queueSale.mockResolvedValue({ id: "local-1", createdAt: "2026-11-12T15:47:00Z" });
    renderScreen();
    expect(screen.getByText("Sin conexión · 2 por enviar")).toBeInTheDocument();
    expect(screen.getByText(/Busca en los productos guardados en este equipo/)).toBeInTheDocument();
    await scan("7751234");
    await screen.findByRole("list", { name: "Productos de la venta" });
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Confirmar venta/ }));
    expect(await screen.findByRole("heading", { name: "Venta guardada en este equipo" })).toBeInTheDocument();
    expect(screen.getByText("Se enviará al volver internet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Imprimir al enviar/ })).toBeDisabled();
    expect(queueSale.mock.calls[0][0]).toMatchObject({ paymentMethod: "efectivo", totalEstimate: "14.00" });
  });

  it("Más vendidos come from the saved catalog", async () => {
    offline.products = [{ ...coca, deleted: false, serverUpdatedAt: "" }];
    renderScreen(["p-1"]);
    const top = await screen.findByRole("list", { name: "Más vendidos" });
    fireEvent.click(within(top).getByRole("button", { name: /Coca Cola 2l/ }));
    expect(within(screen.getByRole("list", { name: "Productos de la venta" })).getByText("Coca Cola 2l")).toBeInTheDocument();
  });

  it("F9 confirms and / goes to the search", async () => {
    vi.mocked(createSaleAction).mockResolvedValue({ ok: false, fieldErrors: {}, message: "x" });
    renderScreen();
    await scan("7751234");
    await screen.findByRole("list", { name: "Productos de la venta" });
    // Agregar devuelve el foco al buscador con un temporizador: se espera antes de quitarlo.
    await waitFor(() => expect(screen.getByRole("searchbox")).toHaveFocus());
    act(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });
    fireEvent.keyDown(document.body, { key: "/" });
    expect(screen.getByRole("searchbox")).toHaveFocus();
    fireEvent.keyDown(document.body, { key: "F9" });
    await waitFor(() => expect(createSaleAction).toHaveBeenCalled(), { timeout: 3000 });
  });

  it("Vaciar asks first", async () => {
    renderScreen();
    await scan("7751234");
    await screen.findByRole("list", { name: "Productos de la venta" });
    fireEvent.click(screen.getByRole("button", { name: "Vaciar" }));
    fireEvent.click(within(screen.getByRole("dialog", { name: "¿Vaciar la venta?" })).getByRole("button", { name: "Vaciar" }));
    expect(screen.getByText("Todavía no hay productos")).toBeInTheDocument();
  });

  it("charges a catalog order: loads its products, warns what can't go in, then offers to close it", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === "/api/products/p-1") return json({ ...coca, is_active: true });
      if (url === "/api/products/p-2") return json({ ...pan, is_active: true });
      if (url === "/api/products/p-gone") return json({ detail: "No encontrado" }, 404);
      return json({}, 404);
    });
    saveOrderForPos({
      id: "order-1",
      customerName: "María Choque",
      items: [
        { productId: "p-1", name: "Coca Cola 2l", quantity: 3 },
        { productId: "p-2", name: "Pan de batalla", quantity: 20 },
        { productId: "p-gone", name: "Galletas", quantity: 1 },
      ],
    });
    const sale = {
      id: "c0ffee00-0000-0000-0000-000000000000",
      items: [],
      subtotal: "28.00",
      discount_type: null,
      discount_value: "0",
      discount_amount: "0",
      total: "28.00",
      payment_method: "efectivo",
      status: "completed",
      business_day_id: null,
      business_date: null,
      created_by_user_id: "u-1",
      created_at: "2026-11-12T15:47:00Z",
      voided_at: null,
      void_reason: null,
    } satisfies Sale;
    vi.mocked(createSaleAction).mockResolvedValue({ ok: true, fieldErrors: {}, sale });
    vi.mocked(updateStorefrontRequestStatusAction).mockResolvedValue({ ok: true, message: "Pedido cerrado" });

    render(<PosScreen policy={policy} storeName="Tienda Local" sellerName="Luis" topProductIds={null} orderId="order-1" />);

    const banner = await screen.findByText("Cobrando el pedido de María Choque");
    const notes = banner.closest("[role=status]") as HTMLElement;
    expect(within(notes).getByText("Coca Cola 2l: pidieron 3, solo hay 2.")).toBeInTheDocument();
    expect(within(notes).getByText("Pan de batalla no tiene stock; no se agregó.")).toBeInTheDocument();
    expect(within(notes).getByText("Galletas ya no está en tu catálogo; no se agregó.")).toBeInTheDocument();
    const items = screen.getByRole("list", { name: "Productos de la venta" });
    expect(within(items).getByText("Coca Cola 2l")).toBeInTheDocument();
    expect(within(items).queryByText("Pan de batalla")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/Cliente/)).toHaveValue("María Choque"));

    fireEvent.click(screen.getByRole("button", { name: /Confirmar venta/ }));
    expect(await screen.findByRole("heading", { name: "Venta registrada" })).toBeInTheDocument();
    const formData = vi.mocked(createSaleAction).mock.calls[0][1];
    expect(JSON.parse(String(formData.get("items")))).toMatchObject([{ product: { id: "p-1" }, quantity: 2 }]);
    expect(formData.get("customer_name")).toBe("María Choque");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar pedido" }));
    await waitFor(() => expect(updateStorefrontRequestStatusAction).toHaveBeenCalledWith("order-1", "closed"));
    expect(await screen.findByText("Cerrado")).toBeInTheDocument();
  });

  it("says so when the order did not reach Vender", async () => {
    const { toast } = await import("sonner");
    render(<PosScreen policy={policy} storeName="Tienda Local" sellerName="Luis" topProductIds={null} orderId="order-404" />);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/No se encontró el pedido/)));
  });
});
