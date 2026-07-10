import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductForm } from "./ProductForm";
import type { ProductActionState } from "../types";

let actionState: ProductActionState = {
  ok: false,
  fieldErrors: {
    name: "Nombre es requerido",
    price: "Precio debe ser mayor a 0",
  },
};

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [actionState, vi.fn(), false],
  };
});

describe("ProductForm", () => {
  beforeEach(() => {
    actionState = {
      ok: false,
      fieldErrors: {
        name: "Nombre es requerido",
        price: "Precio debe ser mayor a 0",
      },
    };
  });

  it("shows field errors", () => {
    render(<ProductForm mode="create" accessToken="test-token" />);

    expect(screen.getByText("Nombre es requerido")).toBeInTheDocument();
    expect(screen.getByText("Precio debe ser mayor a 0")).toBeInTheDocument();
  });

  it("keeps QR preview disabled when scan code is empty", () => {
    render(<ProductForm mode="create" accessToken="test-token" />);

    expect(screen.getByRole("button", { name: "Ver QR" })).toBeDisabled();
  });

  it("opens QR preview for the current scan code", () => {
    render(
      <ProductForm
        mode="edit"
        accessToken="test-token"
        product={{
          id: "product-1",
          name: "Cafe molido",
          price: "12.50",
          stock: 8,
          category_id: null,
          category: null,
          qr_code: "COM000001",
          photo_url: null,
          min_stock: 2,
          unit: "unidad",
          sku: "COM000001",
          cost_price: "8.00",
          is_active: true,
          version: 1,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver QR" }));

    expect(screen.getByRole("dialog", { name: "QR del producto" })).toBeInTheDocument();
    expect(screen.getByText("Cafe molido")).toBeInTheDocument();
    expect(screen.getByText("COM000001")).toBeInTheDocument();
  });

  it("shows backend automatic SKU generation instead of a stale editable preview", () => {
    render(
      <ProductForm
        mode="create"
        accessToken="test-token"
        categories={[
          {
            id: "category-1",
            name: "Cemento",
            sku_prefix: "CEM",
            next_sku_number: 1,
            is_active: true,
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "category-1" } });

    expect(screen.getByText("Automatico al guardar")).toBeInTheDocument();
    expect(screen.getByText("Se generara en el servidor con prefijo CEM.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "SKU" })).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("CEM000001")).not.toBeInTheDocument();
  });

  it("renders submitted values returned after a server error", () => {
    actionState = {
      ok: false,
      message: "El SKU ya esta en uso por otro producto",
      fieldErrors: {},
      values: {
        name: "Cemento cola",
        category_id: "",
        category: "",
        sku: "CEM000001",
        price: "45.50",
        cost_price: "40",
        stock: "12",
        min_stock: "3",
        unit: "bolsa",
        qr_code: "QR-CEM",
        photo_url: "https://example.com/cemento.png",
      },
    };

    render(<ProductForm mode="create" accessToken="test-token" />);

    expect(screen.getByLabelText("Nombre")).toHaveValue("Cemento cola");
    expect(screen.getByLabelText("SKU")).toHaveValue("CEM000001");
    expect(screen.getByLabelText("Precio venta")).toHaveValue(45.5);
    expect(screen.getByLabelText("Codigo escaneable")).toHaveValue("QR-CEM");
    expect(screen.getByText("El SKU ya esta en uso por otro producto")).toBeInTheDocument();
  });
});
