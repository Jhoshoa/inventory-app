import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MarketingHomePage from "../../../../app/(marketing)/page";
import { FAQS, LANDING_FEATURES } from "../data";

describe("Marketing landing", () => {
  it("points every call to action at a real route", () => {
    render(<MarketingHomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("La amiga que anota cada venta.");
    expect(screen.getByRole("link", { name: "Probar 30 días gratis →" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Ver precios" })).toHaveAttribute("href", "#planes");
    expect(screen.getByRole("link", { name: "Ver todas las funciones →" })).toHaveAttribute("href", "/funcionalidades");
    expect(screen.getByRole("link", { name: "Empezar prueba" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Pedir cotización" }).getAttribute("href")).toMatch(/^https:\/\/wa\.me\//);
    expect(screen.getByRole("link", { name: "Hablar con ventas" })).toHaveAttribute("href", "/contacto");
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toBe("#");
    }
  });

  it("lists every feature and answers every question", () => {
    render(<MarketingHomePage />);

    const features = document.getElementById("funciones") as HTMLElement;
    for (const feature of LANDING_FEATURES) {
      expect(within(features).getByRole("heading", { name: feature.title })).toBeInTheDocument();
    }
    for (const faq of FAQS) {
      expect(screen.getByText(faq.question)).toBeInTheDocument();
      expect(screen.getByText(faq.answer)).toBeInTheDocument();
    }
  });
});

describe("BrandLogo", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('splits a "Tu X" brand into the small "tu" and the big name', async () => {
    vi.stubEnv("NEXT_PUBLIC_BRAND_NAME", "Tu Tiendamiga");
    const { BrandLogo } = await import("./BrandLogo");

    render(<BrandLogo />);

    expect(screen.getByText("tu")).toBeInTheDocument();
    expect(screen.getByText("Tiendamiga")).toBeInTheDocument();
  });

  it("shows any other configured brand name whole", async () => {
    vi.stubEnv("NEXT_PUBLIC_BRAND_NAME", "Ferretodo");
    const { BrandLogo } = await import("./BrandLogo");

    render(<BrandLogo />);

    expect(screen.getByText("Ferretodo")).toBeInTheDocument();
  });
});
