import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductListActions } from "./ProductListActions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

describe("ProductListActions", () => {
  it("the owner gets labels, import, download and new product", () => {
    render(<ProductListActions role="owner" />);
    expect(screen.getByRole("link", { name: "Imprimir etiquetas" })).toHaveAttribute("href", "/dashboard/products/labels");
    expect(screen.getByRole("button", { name: "Importar CSV" })).toBeInTheDocument();
    for (const link of screen.getAllByRole("link", { name: /Nuevo producto/ })) {
      expect(link).toHaveAttribute("href", "/dashboard/products/new");
    }
    fireEvent.click(screen.getByRole("button", { name: "Más acciones de productos" }));
    expect(screen.getByRole("menuitem", { name: "Descargar lista (CSV)" })).toHaveAttribute("href", "/api/exports/products");
  });

  it("the phone ⋯ opens Más acciones", () => {
    render(<ProductListActions role="owner" />);
    fireEvent.click(screen.getByRole("button", { name: "Más acciones: importar, etiquetas y descargar" }));
    const sheet = screen.getByRole("dialog", { name: "Más acciones" });
    expect(within(sheet).getByRole("link", { name: /Imprimir etiquetas/ })).toHaveAttribute("href", "/dashboard/products/labels");
    expect(within(sheet).getByRole("link", { name: /Descargar lista \(CSV\)/ })).toHaveAttribute("download");
    fireEvent.click(within(sheet).getByRole("button", { name: /Importar desde CSV/ }));
    expect(screen.queryByRole("dialog", { name: "Más acciones" })).not.toBeInTheDocument();
  });

  it("the cashier has no actions", () => {
    const { container } = render(<ProductListActions role="cashier" />);
    expect(container).toBeEmptyDOMElement();
  });
});
