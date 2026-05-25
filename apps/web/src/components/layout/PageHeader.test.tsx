import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/Button";
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
});
