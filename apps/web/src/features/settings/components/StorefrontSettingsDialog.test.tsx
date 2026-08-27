import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StorefrontSettingsDialog } from "./StorefrontSettingsDialog";
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
};

describe("StorefrontSettingsDialog", () => {
  beforeEach(() => {
    vi.mocked(updateStorefrontAction).mockReset();
    mocks.refresh.mockClear();
  });

  it("opens the dialog and shows validation errors from the server action", async () => {
    vi.mocked(updateStorefrontAction).mockResolvedValue({
      ok: false,
      message: "Corrige los errores del formulario",
      fieldErrors: { slug: "Define un slug antes de activar el catalogo publico" },
    });
    const user = userEvent.setup();

    render(<StorefrontSettingsDialog storeData={storeData} />);

    await user.click(screen.getByRole("button", { name: "Catalogo publico" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(
      await screen.findByText("Define un slug antes de activar el catalogo publico"),
    ).toBeInTheDocument();
  });

  it("refreshes the route after a successful update", async () => {
    vi.mocked(updateStorefrontAction).mockResolvedValue({
      ok: true,
      message: "Catalogo publico actualizado",
      fieldErrors: {},
    });
    const user = userEvent.setup();

    render(<StorefrontSettingsDialog storeData={storeData} />);

    await user.click(screen.getByRole("button", { name: "Catalogo publico" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("shows the public link and a copy button once a slug is set", async () => {
    const user = userEvent.setup();
    render(
      <StorefrontSettingsDialog
        storeData={{ ...storeData, storefront_enabled: true, storefront_slug: "ferreteria-lopez" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Catalogo publico" }));

    expect(screen.getByDisplayValue("ferreteria-lopez")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar enlace/i })).toBeInTheDocument();
  });
});
