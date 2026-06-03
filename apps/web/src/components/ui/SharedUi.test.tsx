import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CollapsibleSection } from "./CollapsibleSection";
import { ErrorState } from "./ErrorState";
import { ForbiddenState } from "./ForbiddenState";
import { Label } from "./Label";
import { Pagination } from "./Pagination";
import { SummaryRow } from "./SummaryRow";

describe("shared UI components", () => {
  it("renders pagination links and disabled states with semantic labels", () => {
    render(
      <Pagination
        basePath="/dashboard/sales"
        searchParams={new URLSearchParams("from=2026-06-01")}
        total={75}
        limit={25}
        offset={25}
      />,
    );

    expect(screen.getByText("Mostrando 26-50 de 75")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute(
      "href",
      "/dashboard/sales?from=2026-06-01&offset=0",
    );
    expect(screen.getByRole("link", { name: "Siguiente" })).toHaveAttribute(
      "href",
      "/dashboard/sales?from=2026-06-01&offset=50",
    );
  });

  it("renders field labels and summary rows with premium tokens", () => {
    render(
      <>
        <Label htmlFor="name">Nombre</Label>
        <SummaryRow label="Total" value="Bs 100,00" strong />
      </>,
    );

    expect(screen.getByText("Nombre")).toHaveClass("text-text-body");
    expect(screen.getByText("Total")).toHaveClass("text-text-strong");
    expect(screen.getByText("Bs 100,00")).toHaveClass("text-text-strong");
  });

  it("renders error and forbidden actions", () => {
    const retry = vi.fn();

    render(
      <>
        <ErrorState retryLabel="Reintentar" onRetry={retry} />
        <ForbiddenState actionHref="/dashboard/settings" actionLabel="Ir a ajustes" />
      </>,
    );

    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a ajustes" })).toHaveAttribute("href", "/dashboard/settings");
  });

  it("renders collapsible sections", () => {
    render(
      <CollapsibleSection title="Filtros" description="Ajusta la busqueda" defaultOpen>
        <p>Contenido</p>
      </CollapsibleSection>,
    );

    expect(screen.getByText("Filtros")).toBeInTheDocument();
    expect(screen.getByText("Ajusta la busqueda")).toBeInTheDocument();
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });
});
