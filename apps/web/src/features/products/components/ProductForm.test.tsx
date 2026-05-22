import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductForm } from "./ProductForm";

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: () => [
      {
        ok: false,
        fieldErrors: {
          name: "Nombre es requerido",
          price: "Precio debe ser mayor a 0",
        },
      },
      vi.fn(),
      false,
    ],
  };
});

describe("ProductForm", () => {
  it("shows field errors", () => {
    render(<ProductForm mode="create" />);

    expect(screen.getByText("Nombre es requerido")).toBeInTheDocument();
    expect(screen.getByText("Precio debe ser mayor a 0")).toBeInTheDocument();
  });

  it("keeps QR preview disabled when scan code is empty", () => {
    render(<ProductForm mode="create" />);

    expect(screen.getByRole("button", { name: "Ver QR" })).toBeDisabled();
  });

  it("opens QR preview for the current scan code", () => {
    render(
      <ProductForm
        mode="edit"
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
});
