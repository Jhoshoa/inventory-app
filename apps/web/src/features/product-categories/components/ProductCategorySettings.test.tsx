import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProductCategoryAction, deactivateProductCategoryAction } from "../actions";
import { ProductCategorySettings } from "./ProductCategorySettings";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("../actions", () => ({
  createProductCategoryAction: vi.fn(),
  deactivateProductCategoryAction: vi.fn(),
}));

describe("ProductCategorySettings", () => {
  beforeEach(() => {
    vi.mocked(createProductCategoryAction).mockReset();
    vi.mocked(deactivateProductCategoryAction).mockReset();
  });

  it("creates a category and updates the table without staying in loading state", async () => {
    vi.mocked(createProductCategoryAction).mockResolvedValue({
      ok: true,
      message: "Categoria creada",
      category: {
        id: "category-1",
        name: "Comida",
        sku_prefix: "COM",
        next_sku_number: 1,
        is_active: true,
      },
      fieldErrors: {},
    });
    const user = userEvent.setup();

    render(<ProductCategorySettings categories={[]} />);

    await user.type(screen.getByLabelText("Nombre"), "Comida");
    await user.type(screen.getByLabelText("Prefijo SKU"), "COM");
    await user.click(screen.getByRole("button", { name: "Crear categoria" }));

    await waitFor(() => {
      expect(screen.getByText("Comida")).toBeInTheDocument();
    });
    expect(screen.getByText("COM")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear categoria" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Creando..." })).not.toBeInTheDocument();
  });

  it("guides owners to create a category when none exist", () => {
    render(<ProductCategorySettings categories={[]} />);

    expect(screen.getByText("Sin categorias configuradas")).toBeInTheDocument();
    expect(screen.getByText(/Crea categorias para agrupar productos/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear categoria" })).toBeEnabled();
  });

  it("deactivates a category and updates the row without staying in loading state", async () => {
    vi.mocked(deactivateProductCategoryAction).mockResolvedValue({
      ok: true,
      message: "Categoria desactivada",
      category: {
        id: "category-1",
        name: "Comida",
        sku_prefix: "COM",
        next_sku_number: 1,
        is_active: false,
      },
      fieldErrors: {},
    });
    const user = userEvent.setup();

    render(
      <ProductCategorySettings
        categories={[
          {
            id: "category-1",
            name: "Comida",
            sku_prefix: "COM",
            next_sku_number: 1,
            is_active: true,
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Desactivar" }));

    await waitFor(() => {
      expect(screen.getByText("Inactiva")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Desactivando..." })).not.toBeInTheDocument();
  });
});
