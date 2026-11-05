import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_STOREFRONT_SETTINGS } from "../settings";
import type { PublicStorefront } from "../types";
import { StorefrontInfoSection } from "./StorefrontInfoSection";

const store: PublicStorefront = {
  name: "Ferreteria Lopez",
  tier: "standard",
  logo_url: null,
  banner_url: null,
  color_primary: null,
  color_secondary: null,
  description: null,
  whatsapp: "59170000000",
  payment_qr_url: null,
  payment_instructions: "Paga con QR y manda el comprobante",
  timezone: "America/La_Paz",
  settings: DEFAULT_STOREFRONT_SETTINGS,
};

describe("StorefrontInfoSection", () => {
  it("shows payment, delivery, address and social links the store configured", () => {
    render(
      <StorefrontInfoSection
        store={{
          ...store,
          settings: {
            ...DEFAULT_STOREFRONT_SETTINGS,
            delivery_enabled: true,
            address: "Calle Sucre 123",
            maps_url: "https://maps.app.goo.gl/abc",
            instagram: "ferre.lopez",
            tiktok: "ferrelopez",
          },
        }}
      />,
    );

    expect(screen.getByText("Paga con QR y manda el comprobante")).toBeInTheDocument();
    expect(screen.getByText("Recojo en tienda")).toBeInTheDocument();
    expect(screen.getByText("Envio a domicilio")).toBeInTheDocument();
    expect(screen.getByText("Calle Sucre 123")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver en Google Maps" })).toHaveAttribute("href", "https://maps.app.goo.gl/abc");
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://www.instagram.com/ferre.lopez");
    expect(screen.getByRole("link", { name: "TikTok" })).toHaveAttribute("href", "https://www.tiktok.com/@ferrelopez");
  });

  it("hides the sections the store turned off", () => {
    render(
      <StorefrontInfoSection
        store={{
          ...store,
          settings: {
            ...DEFAULT_STOREFRONT_SETTINGS,
            show_payment: false,
            show_contact: false,
            pickup_enabled: false,
            address: "Calle Sucre 123",
          },
        }}
      />,
    );

    expect(screen.queryByText("Paga con QR y manda el comprobante")).not.toBeInTheDocument();
    expect(screen.queryByText("Calle Sucre 123")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Informacion de la tienda" })).not.toBeInTheDocument();
  });
});
