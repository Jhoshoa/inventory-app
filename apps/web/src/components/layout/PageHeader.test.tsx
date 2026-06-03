import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/Button";
import { Breadcrumbs } from "./Breadcrumbs";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders title description eyebrow and actions", () => {
    render(
      <PageHeader
        eyebrow="Inventario"
        title="Productos"
        description="Administra productos."
        actions={<Button>Nuevo producto</Button>}
      />,
    );

    expect(screen.getByText("Inventario")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Productos" })).toBeInTheDocument();
    expect(screen.getByText("Administra productos.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nuevo producto" })).toBeInTheDocument();
  });

  it("renders breadcrumbs above the title", () => {
    render(
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Productos" },
            ]}
          />
        }
        title="Productos"
      />,
    );

    const breadcrumbs = screen.getByRole("navigation", { name: "Ruta de navegacion" });
    expect(breadcrumbs).toBeInTheDocument();
    expect(within(breadcrumbs).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(within(breadcrumbs).getByText("Productos")).toHaveAttribute("aria-current", "page");
  });
});
