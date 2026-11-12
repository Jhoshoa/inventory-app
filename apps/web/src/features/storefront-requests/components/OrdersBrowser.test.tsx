import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateStorefrontRequestPaymentAction, updateStorefrontRequestStatusAction } from "../actions";
import { makeList, makeRequest } from "../test/fixtures";
import { OrdersBrowser } from "./OrdersBrowser";

const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("../actions", () => ({
  updateStorefrontRequestStatusAction: vi.fn(),
  updateStorefrontRequestPaymentAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/dashboard/solicitudes" }));

function setWidth(width: number) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: width >= Number(/\d+/.exec(query)?.[0] ?? 0),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

function renderBrowser(props: Partial<Parameters<typeof OrdersBrowser>[0]> = {}) {
  return render(
    <OrdersBrowser
      initialTab="pending"
      initialData={makeList([makeRequest(), makeRequest({ id: "req-2", customer_name: "Jorge Mamani", payment_confirmed: true, items: [], total: null, delivery_method: "pickup" })])}
      storeName="Tienda Local"
      catalogSlug="tienda-local"
      canManageCatalog
      {...props}
    />,
  );
}

describe("OrdersBrowser", () => {
  beforeEach(() => {
    setWidth(1440);
    router.push.mockReset();
    vi.mocked(updateStorefrontRequestStatusAction).mockReset();
    vi.mocked(updateStorefrontRequestPaymentAction).mockReset();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the tabs with their counts and the orders", () => {
    renderBrowser();
    expect(screen.getByRole("tab", { name: "Pendientes · 2" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Contactados · 3" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Cerrados" })).toBeInTheDocument();
    expect(screen.getByText("2 pendientes de responder")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("3 productos")).toBeInTheDocument();
    expect(within(table).getByText("Sin pago")).toBeInTheDocument();
    expect(within(table).getByText("Pagado")).toBeInTheDocument();
  });

  it("asks the API for another tab", async () => {
    const fetchMock = vi.fn(async () => Response.json(makeList([], { pending_count: 2, status_counts: { pending: 2, contacted: 0, closed: 0 } })));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderBrowser();

    await user.click(screen.getByRole("tab", { name: "Contactados · 3" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/storefront-requests?limit=50&offset=0&status=contacted", expect.anything());
    expect(await screen.findByText("Sin pedidos contactados")).toBeInTheDocument();
  });

  it("offers the catalog link when there is nothing pending", () => {
    renderBrowser({ initialData: makeList([], { pending_count: 0, status_counts: { pending: 0, contacted: 0, closed: 0 } }) });
    expect(screen.getByText("No tienes pedidos por responder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar link" })).toBeInTheDocument();
  });

  it("opens the detail, suggests Contactado after WhatsApp and moves the counts", async () => {
    vi.mocked(updateStorefrontRequestStatusAction).mockResolvedValue({
      ok: true,
      message: "Pedido marcado como contactado",
      request: makeRequest({ status: "contacted" }),
    });
    const user = userEvent.setup();
    renderBrowser();

    await user.click(within(screen.getByRole("table")).getAllByRole("button")[0]);
    const panel = screen.getByRole("complementary", { name: "Detalle del pedido" });
    expect(within(panel).getByRole("heading", { name: "María Choque" })).toBeInTheDocument();
    expect(within(panel).getByText(/Calle 21 de Calacoto/)).toBeInTheDocument();
    const whatsapp = within(panel).getByRole("link", { name: /Escribir por WhatsApp/ });
    expect(whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/59170011122\?text=/);

    whatsapp.addEventListener("click", (event) => event.preventDefault());
    await user.click(whatsapp);
    await user.click(within(panel).getByRole("button", { name: "Marcar como contactado" }));

    expect(updateStorefrontRequestStatusAction).toHaveBeenCalledWith("req-1", "contacted");
    await waitFor(() => expect(within(panel).getByRole("radio", { name: "Contactado" })).toHaveAttribute("aria-checked", "true"));
    expect(screen.getByRole("tab", { name: "Pendientes · 1" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Contactados · 4" })).toBeInTheDocument();
  });

  it("marks the payment as received", async () => {
    vi.mocked(updateStorefrontRequestPaymentAction).mockResolvedValue({ ok: true, message: "Pago recibido", request: makeRequest({ payment_confirmed: true }) });
    const user = userEvent.setup();
    renderBrowser();

    await user.click(within(screen.getByRole("table")).getAllByRole("button")[0]);
    await user.click(screen.getByRole("switch", { name: "Pago recibido" }));

    expect(updateStorefrontRequestPaymentAction).toHaveBeenCalledWith("req-1", true);
    await waitFor(() => expect(screen.getByRole("switch", { name: "Pago recibido" })).toBeChecked());
  });

  it("sends the order to Vender", async () => {
    const user = userEvent.setup();
    renderBrowser();

    await user.click(within(screen.getByRole("table")).getAllByRole("button")[0]);
    await user.click(screen.getByRole("button", { name: "Cobrar en Vender" }));

    expect(router.push).toHaveBeenCalledWith("/dashboard/pos?pedido=req-1");
    expect(JSON.parse(window.sessionStorage.getItem("pos.order.v1") ?? "{}")).toMatchObject({
      id: "req-1",
      customerName: "María Choque",
      items: [
        { productId: "p-1", quantity: 2 },
        { productId: "p-2", quantity: 20 },
        { productId: "p-3", quantity: 1 },
      ],
    });
  });

  it("uses a sheet on the phone", async () => {
    setWidth(375);
    const user = userEvent.setup();
    renderBrowser();

    await user.click(screen.getAllByRole("button", { name: /Jorge Mamani/ })[0]);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Jorge Mamani" })).toBeInTheDocument();
    expect(within(dialog).getByText(/Consulta por/)).toBeInTheDocument();
  });
});
