import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deactivateProductCategoryAction, saveProductCategoryAction } from "../actions";
import type { ProductCategory } from "../types";
import { CategoryManager } from "./CategoryManager";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => "/dashboard/products/categorias",
}));

vi.mock("../actions", () => ({
  saveProductCategoryAction: vi.fn(),
  deactivateProductCategoryAction: vi.fn(),
}));

const categories: ProductCategory[] = [
  { id: "c-1", name: "Abarrotes", sku_prefix: "ABA", next_sku_number: 10, is_active: true },
  { id: "c-2", name: "Lácteos", sku_prefix: "LAC", next_sku_number: 5, is_active: true },
  { id: "c-3", name: "Golosinas", sku_prefix: "GOL", next_sku_number: 1, is_active: false },
];

describe("CategoryManager", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.mocked(saveProductCategoryAction).mockReset();
    vi.mocked(deactivateProductCategoryAction).mockReset();
  });

  it("shows the counts, tabs and each category with its next SKU", () => {
    render(<CategoryManager categories={categories} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Categorías");
    expect(screen.getByText("3 categorías · 2 activas")).toBeInTheDocument();
    const tabs = screen.getByRole("navigation", { name: "Secciones de productos" });
    expect(within(tabs).getByRole("link", { name: "Categorías" })).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "Lugares en la tienda" })).toHaveAttribute("href", "/dashboard/products/lugares");

    const table = screen.getByRole("table");
    expect(within(table).getByText("ABA000010")).toBeInTheDocument();
    expect(within(table).getByText("Desactivada")).toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: "Desactivar Golosinas" })).not.toBeInTheDocument();

    const cards = screen.getByRole("list", { name: "Categorías" });
    expect(within(cards).getByText("Prefijo LAC · próximo LAC000005")).toBeInTheDocument();
  });

  it("creates a category, showing a repeated prefix on its field", async () => {
    vi.mocked(saveProductCategoryAction)
      .mockResolvedValueOnce({ ok: false, fieldErrors: { sku_prefix: "Ya existe una categoría con ese prefijo SKU." } })
      .mockResolvedValueOnce({
        ok: true,
        message: "Categoría creada",
        category: { id: "c-4", name: "Panadería", sku_prefix: "PAN", next_sku_number: 1, is_active: true },
        fieldErrors: {},
      });
    render(<CategoryManager categories={categories} />);

    fireEvent.click(screen.getAllByRole("button", { name: /Nueva categoría/ })[0]);
    const dialog = screen.getByRole("dialog", { name: "Nueva categoría" });
    await waitFor(() => expect(within(dialog).getByLabelText("Nombre")).toHaveFocus());
    fireEvent.change(within(dialog).getByLabelText("Nombre"), { target: { value: "Panadería" } });
    fireEvent.change(within(dialog).getByLabelText("Prefijo del SKU"), { target: { value: "pan" } });
    expect(within(dialog).getByLabelText("Prefijo del SKU")).toHaveValue("PAN");
    expect(within(dialog).getByText(/PAN000001, PAN000002…/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Crear categoría" }));
    expect(await within(dialog).findByText("Ya existe una categoría con ese prefijo SKU.")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Prefijo del SKU")).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(within(dialog).getByLabelText("Prefijo del SKU")).toHaveFocus());

    fireEvent.click(within(dialog).getByRole("button", { name: "Crear categoría" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(refresh).toHaveBeenCalled();
    const formData = vi.mocked(saveProductCategoryAction).mock.calls[1][1];
    expect(formData.get("name")).toBe("Panadería");
    expect(formData.get("sku_prefix")).toBe("PAN");
    expect(formData.get("category_id")).toBeNull();
  });

  it("validates before calling the API", () => {
    render(<CategoryManager categories={categories} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Nueva categoría/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Crear categoría" }));
    expect(screen.getByText("Escribe el nombre")).toBeInTheDocument();
    expect(screen.getByText("Escribe el prefijo del SKU")).toBeInTheDocument();
    expect(saveProductCategoryAction).not.toHaveBeenCalled();
  });

  it("edits with the category id and explains existing SKUs do not change", async () => {
    vi.mocked(saveProductCategoryAction).mockResolvedValue({
      ok: true,
      category: { ...categories[1], name: "Lácteos y huevos" },
      fieldErrors: {},
    });
    render(<CategoryManager categories={categories} />);
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Editar Lácteos" }));
    const dialog = screen.getByRole("dialog", { name: "Editar categoría" });
    expect(within(dialog).getByLabelText("Nombre")).toHaveValue("Lácteos");
    expect(within(dialog).getByText(/Los SKU que ya existen no cambian/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Nombre"), { target: { value: "Lácteos y huevos" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(saveProductCategoryAction).toHaveBeenCalled());
    expect(vi.mocked(saveProductCategoryAction).mock.calls[0][1].get("category_id")).toBe("c-2");
  });

  it("deactivating asks for confirmation, also from Editar", async () => {
    vi.mocked(deactivateProductCategoryAction).mockResolvedValue({ ok: true, fieldErrors: {} });
    render(<CategoryManager categories={categories} />);

    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Editar Abarrotes" }));
    fireEvent.click(screen.getByRole("button", { name: "Desactivar…" }));
    const confirm = screen.getByRole("dialog", { name: '¿Desactivar "Abarrotes"?' });
    expect(within(confirm).getByText(/Los productos que ya la tienen la conservan/)).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole("button", { name: "Desactivar" }));
    await waitFor(() => expect(deactivateProductCategoryAction).toHaveBeenCalledWith("c-1"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps the confirmation open when deactivating fails", async () => {
    vi.mocked(deactivateProductCategoryAction).mockResolvedValue({ ok: false, message: "Sin conexión", fieldErrors: {} });
    render(<CategoryManager categories={categories} />);
    fireEvent.click(screen.getByRole("button", { name: "Desactivar Lácteos" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Desactivar" }));
    await waitFor(() => expect(deactivateProductCategoryAction).toHaveBeenCalled());
    expect(screen.getByRole("dialog", { name: '¿Desactivar "Lácteos"?' })).toBeInTheDocument();
  });

  it("empty and error states", () => {
    const { rerender } = render(<CategoryManager categories={[]} />);
    expect(screen.getByText("Crea tu primera categoría para tener SKU automático")).toBeInTheDocument();
    rerender(<CategoryManager categories={[]} loadError="Fallo del servidor" />);
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refresh).toHaveBeenCalled();
  });
});
