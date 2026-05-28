import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageContainer } from "./PageContainer";
import { PageSection } from "./PageSection";
import { ResponsiveActions } from "./ResponsiveActions";
import { ResponsiveToolbar } from "./ResponsiveToolbar";

describe("layout primitives", () => {
  it("renders page container as the main landmark", () => {
    render(<PageContainer>Contenido</PageContainer>);

    expect(screen.getByRole("main")).toHaveTextContent("Contenido");
  });

  it("renders page sections and responsive groups", () => {
    render(
      <PageContainer>
        <PageSection aria-label="Resumen">Resumen</PageSection>
        <ResponsiveToolbar>
          <label htmlFor="search">Buscar</label>
          <input id="search" />
        </ResponsiveToolbar>
        <ResponsiveActions>
          <button type="button">Guardar</button>
        </ResponsiveActions>
      </PageContainer>,
    );

    expect(screen.getByRole("region", { name: "Resumen" })).toHaveTextContent("Resumen");
    expect(screen.getByLabelText("Buscar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });
});
