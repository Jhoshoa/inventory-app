import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StorefrontBoletaProvider } from "../boleta";
import { createStorefrontOrderAction } from "../requestActions";
import type { PublicStorefrontProduct } from "../types";
import { StorefrontAddToBoletaButton } from "./StorefrontAddToBoleta";
import { StorefrontBoleta } from "./StorefrontBoleta";

vi.mock("../requestActions", () => ({
  createStorefrontOrderAction: vi.fn(),
}));

const product = (id: string, name: string, price: string, available = true): PublicStorefrontProduct => ({
  id,
  name,
  price,
  unit: "unidad",
  photo_url: null,
  available,
  low_stock: false,
  category: null,
  category_id: null,
  discount_type: null,
  discount_value: "0",
  effective_price: price,
});

const MILK = product("p-milk", "Leche Pil 1l", "8.00");
const CHEESE = product("p-cheese", "Queso Criollo", "55.00");

function renderStore(products = [MILK, CHEESE], overrides: Partial<Parameters<typeof StorefrontBoleta>[0]> = {}) {
  return render(
    <StorefrontBoletaProvider slug="tienda">
      {products.map((p) => (
        <StorefrontAddToBoletaButton key={p.id} product={p} />
      ))}
      <StorefrontBoleta
        slug="tienda"
        storeName="Tienda Local"
        storeWhatsapp="59170000000"
        paymentQrUrl={null}
        paymentInstructions={null}
        pickupEnabled
        deliveryEnabled={false}
        colorPrimary="#1F3BFF"
        {...overrides}
      />
    </StorefrontBoletaProvider>,
  );
}

describe("Boleta del catalogo", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(createStorefrontOrderAction).mockReset();
  });

  it("adds products and shows the running total in the bar", async () => {
    const user = userEvent.setup();
    renderStore();

    expect(screen.queryByRole("button", { name: "Ver boleta" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Agregar Leche Pil 1l a la boleta" }));
    await user.click(screen.getByRole("button", { name: /Agregar otro Leche Pil 1l/ }));
    await user.click(screen.getByRole("button", { name: "Agregar Queso Criollo a la boleta" }));

    expect(screen.getByText("Tu boleta · 3 productos")).toBeInTheDocument();
    expect(screen.getByText(/71,00/)).toBeInTheDocument();
    expect(document.body.dataset.boleta).toBe("open");
    const stored = JSON.parse(window.localStorage.getItem("tiendamiga:boleta:tienda") ?? "[]");
    expect(stored.map((l: { productId: string; quantity: number }) => [l.productId, l.quantity])).toEqual([
      ["p-milk", 2],
      ["p-cheese", 1],
    ]);
  });

  it("does not offer sold-out products", () => {
    renderStore([product("p-x", "Agotado", "5.00", false)]);

    expect(screen.queryByRole("button", { name: /Agregar/ })).not.toBeInTheDocument();
  });

  it("restores the boleta saved in the browser", () => {
    window.localStorage.setItem(
      "tiendamiga:boleta:tienda",
      JSON.stringify([{ productId: "p-milk", name: "Leche Pil 1l", unit: "unidad", unitPrice: "8.00", photoUrl: null, quantity: 4 }]),
    );

    renderStore();

    expect(screen.getByText("Tu boleta · 4 productos")).toBeInTheDocument();
  });

  it("sends only ids and quantities, then shows the server detail and a WhatsApp link", async () => {
    vi.mocked(createStorefrontOrderAction).mockResolvedValue({
      ok: true,
      message: "Listo",
      order: {
        id: "o-1",
        items: [
          { product_id: "p-milk", product_name: "Leche Pil 1l", unit: "unidad", quantity: 2, unit_price: "8.00", line_total: "16.00" },
        ],
        total: "16.00",
        delivery_method: "pickup",
        created_at: "2026-11-10T12:00:00Z",
      },
    });
    const user = userEvent.setup();
    renderStore();

    await user.click(screen.getByRole("button", { name: "Agregar Leche Pil 1l a la boleta" }));
    await user.click(screen.getByRole("button", { name: /Agregar otro Leche Pil 1l/ }));
    await user.click(screen.getByRole("button", { name: "Ver boleta" }));
    await user.type(screen.getByLabelText("Tu nombre"), "Ana");
    await user.type(screen.getByPlaceholderText("Tu numero"), "71234567");
    await user.click(screen.getByRole("button", { name: "Enviar pedido" }));

    expect(vi.mocked(createStorefrontOrderAction).mock.calls[0][1]).toEqual([{ product_id: "p-milk", quantity: 2 }]);
    expect(await screen.findByText("Pedido enviado")).toBeInTheDocument();
    const whatsapp = screen.getByRole("link", { name: /Enviar detalle por WhatsApp/ });
    const text = decodeURIComponent(whatsapp.getAttribute("href") ?? "");
    expect(text).toContain("https://wa.me/59170000000");
    expect(text).toContain("2 unidad x Leche Pil 1l");
    expect(text).toContain("Entrega: Recojo en tienda");
    expect(screen.queryByText(/Tu boleta ·/)).not.toBeInTheDocument();
    expect(window.localStorage.getItem("tiendamiga:boleta:tienda")).toBeNull();
  });

  it("marks the products the store no longer has and blocks sending until they are removed", async () => {
    vi.mocked(createStorefrontOrderAction).mockResolvedValue({
      ok: false,
      message: "Algunos productos de tu boleta ya no estan disponibles.",
      fieldErrors: {},
      unavailableProductIds: ["p-cheese"],
    });
    const user = userEvent.setup();
    renderStore();

    await user.click(screen.getByRole("button", { name: "Agregar Leche Pil 1l a la boleta" }));
    await user.click(screen.getByRole("button", { name: "Agregar Queso Criollo a la boleta" }));
    await user.click(screen.getByRole("button", { name: "Ver boleta" }));
    await user.type(screen.getByLabelText("Tu nombre"), "Ana");
    await user.type(screen.getByPlaceholderText("Tu numero"), "71234567");
    await user.click(screen.getByRole("button", { name: "Enviar pedido" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Ya no esta disponible/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Enviar pedido" })).toBeDisabled();

    await user.click(within(dialog).getByRole("button", { name: "Quitar Queso Criollo" }));
    expect(within(dialog).getByRole("button", { name: "Enviar pedido" })).toBeEnabled();
  });

  it("asks how to receive the order only when the store offers both options", async () => {
    const user = userEvent.setup();
    renderStore([MILK], { deliveryEnabled: true });

    await user.click(screen.getByRole("button", { name: "Agregar Leche Pil 1l a la boleta" }));
    await user.click(screen.getByRole("button", { name: "Ver boleta" }));

    expect(screen.getByRole("radio", { name: "Recojo en tienda" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Envio a domicilio" })).toBeInTheDocument();
  });
});
