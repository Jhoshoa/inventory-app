import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductListActions } from "./ProductListActions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("../actions", () => ({ updateDefaultAlertDaysAction: vi.fn() }));

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

  it("the desktop ⋯ has Aviso de vencimiento when the store default is known", () => {
    const { rerender } = render(<ProductListActions role="owner" alertDays={5} />);
    fireEvent.click(screen.getByRole("button", { name: "Más acciones de productos" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Aviso de vencimiento" }));
    expect(screen.getByRole("dialog", { name: "Aviso de vencimiento" })).toBeInTheDocument();
    rerender(<ProductListActions role="owner" alertDays={null} />);
  });

  it("without the store default there is no Aviso de vencimiento", () => {
    render(<ProductListActions role="owner" />);
    fireEvent.click(screen.getByRole("button", { name: "Más acciones de productos" }));
    expect(screen.queryByRole("menuitem", { name: "Aviso de vencimiento" })).not.toBeInTheDocument();
  });

  it("the phone ⋯ opens Más acciones", () => {
    render(<ProductListActions role="owner" alertDays={7} />);
    fireEvent.click(screen.getByRole("button", { name: /^Más acciones: importar/ }));
    const sheet = screen.getByRole("dialog", { name: "Más acciones" });
    expect(within(sheet).getByRole("link", { name: /Imprimir etiquetas/ })).toHaveAttribute("href", "/dashboard/products/labels");
    expect(within(sheet).getByRole("link", { name: /Descargar lista \(CSV\)/ })).toHaveAttribute("download");
    expect(within(sheet).getByRole("link", { name: /Categorías/ })).toHaveAttribute("href", "/dashboard/products/categorias");
    expect(within(sheet).getByRole("link", { name: /Lugares en la tienda/ })).toHaveAttribute("href", "/dashboard/products/lugares");
    expect(within(sheet).getByRole("button", { name: /Aviso de vencimiento.*7 días antes/ })).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: /Importar desde CSV/ }));
    expect(screen.queryByRole("dialog", { name: "Más acciones" })).not.toBeInTheDocument();
  });

  it("the cashier has no actions", () => {
    const { container } = render(<ProductListActions role="cashier" />);
    expect(container).toBeEmptyDOMElement();
  });
});
