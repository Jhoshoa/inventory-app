import { render, screen, within } from "@testing-library/react";
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

function setWide(wide: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: wide, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
}

/** Escritorio: el menú de partes. */
async function openPart(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(within(screen.getByRole("navigation", { name: "Partes del catálogo" })).getByRole("button", { name }));
}

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
  default_alert_days: 5,
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
    setWide(true);
  });

  it("shows the server's errors and opens the part that has the first one", async () => {
    vi.mocked(updateStorefrontAction).mockResolvedValue({
      ok: false,
      message: "Corrige los errores del formulario",
      fieldErrors: { slug: "Elige el link antes de encender el catálogo", "hours.0": "Lunes: indica la hora" },
    });
    const user = userEvent.setup();

    render(<StorefrontSettingsForm storeData={storeData} />);
    await openPart(user, "Contacto y horario");
    await user.click(screen.getByLabelText(/Mostrar horario de atención/));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Elige el link antes de encender el catálogo")).toBeVisible();
    expect(screen.getByText("Lunes: indica la hora")).toBeInTheDocument();
  });

  it("refreshes the route after a successful update", async () => {
    vi.mocked(updateStorefrontAction).mockResolvedValue({ ok: true, message: "ok", fieldErrors: {} });
    const user = userEvent.setup();

    render(<StorefrontSettingsForm storeData={storeData} />);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("sends every part, also the hidden ones, and the switch once", async () => {
    vi.mocked(updateStorefrontAction).mockResolvedValue({ ok: true, message: "ok", fieldErrors: {} });
    const user = userEvent.setup();

    render(<StorefrontSettingsForm storeData={{ ...storeData, storefront_enabled: true, storefront_slug: "ferreteria-lopez" }} />);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    const formData = vi.mocked(updateStorefrontAction).mock.calls[0][1];
    expect(formData.getAll("storefront_enabled")).toEqual(["on"]);
    expect(formData.get("storefront_slug")).toBe("ferreteria-lopez");
    expect(formData.get("storefront_whatsapp")).toBe("59170000000");
    expect(formData.get("settings_template")).toBe("vitrina");
  });

  it("links to the live catalog once it is on", () => {
    render(<StorefrontSettingsForm storeData={{ ...storeData, storefront_enabled: true, storefront_slug: "ferreteria-lopez" }} />);

    expect(screen.getByDisplayValue("ferreteria-lopez")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /copiar link/i }).length).toBeGreaterThan(0);
    for (const link of screen.getAllByRole("link", { name: /abrir catálogo/i })) {
      expect(link).toHaveAttribute("href", "/t/ferreteria-lopez");
    }
    expect(screen.getAllByText("Encendido").length).toBeGreaterThan(0);
  });

  it("prefills the WhatsApp with the store phone and offers logo and banner uploads", async () => {
    const user = userEvent.setup();
    render(<StorefrontSettingsForm storeData={storeData} />);

    await openPart(user, "Pedidos por WhatsApp");
    expect(screen.getByLabelText("WhatsApp que recibe los pedidos")).toHaveValue("70000000");
    await openPart(user, "Identidad");
    expect(screen.getByLabelText("Subir logo de la tienda")).toBeVisible();
    expect(screen.getByLabelText("Subir banner de la tienda")).toBeVisible();
  });

  it("only asks for the announcement text once it is turned on", async () => {
    const user = userEvent.setup();
    render(<StorefrontSettingsForm storeData={storeData} />);
    await openPart(user, "Secciones");

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
    render(<StorefrontSettingsForm storeData={{ ...storeData, storefront_settings: { ...DEFAULT_STOREFRONT_SETTINGS, hours } }} />);
    await openPart(user, "Contacto y horario");

    expect(screen.getByLabelText("Lunes: abre")).toHaveValue("09:00");
    expect(screen.queryByLabelText("Viernes: abre")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /horario del lunes/ }));

    expect(screen.getByLabelText("Viernes: abre")).toHaveValue("09:00");
    expect(screen.queryByLabelText("Sabado: abre")).not.toBeInTheDocument();
  });

  it("shows the social handles saved by the backend in a friendly form", () => {
    render(
      <StorefrontSettingsForm
        storeData={{ ...storeData, storefront_settings: { ...DEFAULT_STOREFRONT_SETTINGS, instagram: "mitienda", facebook: "mitienda" } }}
      />,
    );

    expect(screen.getByLabelText("Instagram")).toHaveValue("@mitienda");
    expect(screen.getByLabelText("Facebook")).toHaveValue("facebook.com/mitienda");
  });
});

describe("StorefrontSettingsForm on the phone", () => {
  beforeEach(() => setWide(false));

  it("lists the parts with a summary and opens one with a way back", async () => {
    const user = userEvent.setup();
    render(<StorefrontSettingsForm storeData={{ ...storeData, storefront_enabled: true, storefront_slug: "ferreteria-lopez" }} />);

    expect(screen.getByRole("switch")).toBeChecked();
    expect(screen.getByText("/t/ferreteria-lopez")).toBeInTheDocument();
    const parts = screen.getByRole("list", { name: "Partes del catálogo" });
    expect(within(parts).getByRole("button", { name: /Plantilla.*Vitrina/ })).toBeInTheDocument();
    expect(within(parts).getByRole("button", { name: /Pedidos por WhatsApp.*\+591 70000000/ })).toBeInTheDocument();

    await user.click(within(parts).getByRole("button", { name: /Plantilla/ }));
    expect(screen.getByRole("heading", { name: "Plantilla" })).toBeVisible();
    expect(screen.getByRole("radio", { name: /Lista de precios/ })).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: "Catálogo público" }).find((button) => button.checkVisibility?.() !== false)!);
    expect(screen.getByRole("list", { name: "Partes del catálogo" })).toBeInTheDocument();
  });
});

describe("StorefrontSettingsForm templates", () => {
  beforeEach(() => setWide(true));

  it("switches the live preview when another template is picked", async () => {
    const user = userEvent.setup();
    render(<StorefrontSettingsForm storeData={storeData} />);
    await openPart(user, "Plantilla");

    expect(screen.getByRole("img", { name: "Vista previa de la plantilla Vitrina" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Lista de precios/ }));

    expect(screen.getByRole("img", { name: "Vista previa de la plantilla Lista de precios" })).toBeInTheDocument();
    expect(screen.getByLabelText("Color de acento")).toHaveAttribute("placeholder", "#FFE14D");
  });
});
