import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthShell } from "./AuthShell";

describe("AuthShell", () => {
  it("renders premium auth structure with content and footer link", () => {
    render(
      <AuthShell
        title="Iniciar sesion"
        description="Ingresa para administrar tu tienda."
        footerText="No tienes cuenta?"
        footerHref="/register"
        footerLinkLabel="Crea una tienda"
      >
        <button type="button">Continuar</button>
      </AuthShell>,
    );

    expect(screen.getByText("App Inventario")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Iniciar sesion" })).toBeInTheDocument();
    expect(screen.getByText("Ingresa para administrar tu tienda.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crea una tienda" })).toHaveAttribute(
      "href",
      "/register",
    );
  });
});
