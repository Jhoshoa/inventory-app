import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STOREFRONT_SETTINGS } from "@/features/storefront/settings";
import { StorefrontSettingsForm } from "./StorefrontSettingsForm";
import { updateStorefrontAction } from "../actions";
import type { StoreResponse } from "../types";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("../actions", () => ({
  updateStorefrontAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

const storeData: StoreResponse = {
  id: "store-1",
  name: "Ferreteria Lopez",
  address: null,
  phone: "70000000",
  is_active: true,
  allow_percentage_discount: false,
  max_percentage_discount: "0",
  allow_manual_discount: false,
  max_manual_discount_amount: "0",
  allow_cashier_discount_override: false,
  storefront_enabled: false,
  storefront_slug: null,
  storefront_tier: "none",
  storefront_logo_url: null,
  storefront_banner_url: null,
  storefront_color_primary: null,
  storefront_color_secondary: null,
  storefront_description: null,
  storefront_whatsapp: null,
  storefront_payment_qr_url: null,
  storefront_payment_instructions: null,
  storefront_settings: DEFAULT_STOREFRONT_SETTINGS,
};

describe("StorefrontSettingsForm", () => {
  beforeEach(() => {
    vi.mocked(updateStorefrontAction).mockReset();
    mocks.refresh.mockClear();
  });

  it("shows validation errors from the server action", async () => {
    vi.mocked(updateStorefrontAction).mockResolvedValue({
      ok: false,
      message: "Corrige los errores del formulario",
      fieldErrors: { slug: "Define un slug antes de activar el catalogo publico", "hours.0": "Lunes: indica la hora" },
    });
    const user = userEvent.setup();

    render(<StorefrontSettingsForm storeData={storeData} />);
    await user.click(screen.getByLabelText(/Mostrar horario de atencion/));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Define un slug antes de activar el catalogo publico")).toBeInTheDocument();
    expect(screen.getByText("Lunes: indica la hora")).toBeInTheDocument();
  });

  it("refreshes the route after a successful update", async () => {
    vi.mocked(updateStorefrontAction).mockResolvedValue({
      ok: true,
      message: "Catalogo publico actualizado",
      fieldErrors: {},
    });
    const user = userEvent.setup();

    render(<StorefrontSettingsForm storeData={storeData} />);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("links to the live catalog once it is active", () => {
    render(
      <StorefrontSettingsForm
        storeData={{ ...storeData, storefront_enabled: true, storefront_slug: "ferreteria-lopez" }}
      />,
    );

    expect(screen.getByDisplayValue("ferreteria-lopez")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar enlace/i })).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: /ver catalogo/i })) {
      expect(link).toHaveAttribute("href", "/t/ferreteria-lopez");
    }
  });

  it("prefills the WhatsApp with the store phone and offers logo and banner uploads", () => {
    render(<StorefrontSettingsForm storeData={storeData} />);

    expect(screen.getByLabelText("WhatsApp de contacto")).toHaveValue("70000000");
    expect(screen.getByLabelText("Codigo de pais")).toHaveValue("BO");
    expect(document.querySelector('input[name="storefront_whatsapp"]')).toHaveValue("59170000000");
    expect(screen.getByLabelText("Subir logo de la tienda")).toBeInTheDocument();
    expect(screen.getByLabelText("Subir banner de la tienda")).toBeInTheDocument();
  });

  it("only asks for the announcement text once the cinta is turned on", async () => {
    const user = userEvent.setup();
    render(<StorefrontSettingsForm storeData={storeData} />);

    expect(screen.queryByLabelText("Texto de la cinta de anuncio")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/Cinta de anuncio/));

    expect(screen.getByLabelText("Texto de la cinta de anuncio")).toBeInTheDocument();
  });

  it("shows saved hours and copies Monday to the other weekdays", async () => {
    const user = userEvent.setup();
    const hours = [
      { is_open: true, opens_at: "09:00", closes_at: "18:00" },
      ...Array.from({ length: 6 }, () => ({ is_open: false, opens_at: null, closes_at: null })),
    ];
    render(
      <StorefrontSettingsForm
        storeData={{ ...storeData, storefront_settings: { ...DEFAULT_STOREFRONT_SETTINGS, hours } }}
      />,
    );

    expect(screen.getByLabelText("Lunes: abre")).toHaveValue("09:00");
    expect(screen.queryByLabelText("Viernes: abre")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /horario del lunes/ }));

    expect(screen.getByLabelText("Viernes: abre")).toHaveValue("09:00");
    expect(screen.queryByLabelText("Sabado: abre")).not.toBeInTheDocument();
  });

  it("shows the social handles saved by the backend in a friendly form", () => {
    render(
      <StorefrontSettingsForm
        storeData={{
          ...storeData,
          storefront_settings: { ...DEFAULT_STOREFRONT_SETTINGS, instagram: "mitienda", facebook: "mitienda" },
        }}
      />,
    );

    expect(screen.getByLabelText("Instagram")).toHaveValue("@mitienda");
    expect(screen.getByLabelText("Facebook")).toHaveValue("facebook.com/mitienda");
  });
});
