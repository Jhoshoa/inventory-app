import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductLabelPage } from "./ProductLabelPage";
import type { Product, ProductListResponse, ProductSearchParams } from "../types";

vi.mock("../qr", () => ({
  generateQrSvg: vi.fn(async (value: string) => `<svg>${value}</svg>`),
  svgToDataUri: (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`,
}));

const params: ProductSearchParams = {
  stock: "all",
  limit: 50,
  offset: 0,
  sort: "name",
  direction: "asc",
};

const codedProduct: Product = {
  id: "product-1",
  name: "Cafe molido",
  price: "12.50",
  stock: 10,
  category_id: "category-1",
  category: "Comida",
  qr_code: "COM000001",
  photo_url: null,
  min_stock: 2,
  unit: "unidad",
  sku: "COM000001",
  cost_price: "8.00",
  is_active: true,
  version: 1,
};

const productWithoutCode: Product = {
  ...codedProduct,
  id: "product-2",
  name: "Producto sin codigo",
  qr_code: null,
  sku: null,
};

const initialProducts: ProductListResponse = {
  items: [codedProduct, productWithoutCode],
  total: 2,
  limit: 50,
  offset: 0,
};

describe("ProductLabelPage", () => {
  it("selects products with scan code and renders print preview", async () => {
    render(<ProductLabelPage initialParams={params} initialProducts={initialProducts} categories={[]} />);

    fireEvent.click(screen.getByLabelText("Seleccionar Cafe molido"));

    expect(screen.getByText("1 etiquetas listas para imprimir.")).toBeInTheDocument();
    expect(screen.getAllByText("Cafe molido")).toHaveLength(2);
    expect(screen.getByText("Cod: COM000001")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Imprimir" })).toBeEnabled();
    await waitFor(() => expect(screen.getByAltText("QR COM000001")).toBeInTheDocument());
  });

  it("does not allow selecting products without scan code", () => {
    render(<ProductLabelPage initialParams={params} initialProducts={initialProducts} categories={[]} />);

    expect(screen.getByLabelText("Seleccionar Producto sin codigo")).toBeDisabled();
    expect(screen.getByText("Sin codigo escaneable")).toBeInTheDocument();
  });

  it("updates label summary from page settings", () => {
    render(<ProductLabelPage initialParams={params} initialProducts={initialProducts} categories={[]} />);

    expect(screen.getByText("2.00 x 1.00 cm")).toBeInTheDocument();
    expect(screen.getByText("0.84 x 0.84 cm")).toBeInTheDocument();
    expect(screen.getByText("160")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Tamano de etiqueta"), {
      target: { value: "60x40" },
    });

    expect(screen.getByText("6.00 x 4.00 cm")).toBeInTheDocument();
    expect(screen.getByText("2.88 x 2.88 cm")).toBeInTheDocument();
  });

  it("renders prices in Bolivianos", async () => {
    render(<ProductLabelPage initialParams={params} initialProducts={initialProducts} categories={[]} />);

    fireEvent.click(screen.getByLabelText("Seleccionar Cafe molido"));

    expect(screen.getByText("Bs. 12.50")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByAltText("QR COM000001")).toBeInTheDocument());
  });
});
