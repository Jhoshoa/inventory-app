import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductLabelPage } from "./ProductLabelPage";
import type { Product, ProductListResponse, ProductSearchParams } from "../types";

vi.mock("../qr", () => ({
  generateQrSvg: vi.fn(async (value: string) => `<svg>${value}</svg>`),
  svgToDataUri: (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`,
}));

const params: ProductSearchParams = {
  q: "caf",
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
  discount_type: null,
  discount_value: "0",
  discount_ends_at: null,
  effective_price: "12.50",
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
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:labels"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("adds products with a code and shows the preview with the sheets", async () => {
    render(<ProductLabelPage initialParams={params} initialProducts={initialProducts} categories={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Agregar Cafe molido" }));

    expect(screen.getByRole("heading", { name: "Elegidos · 1" })).toBeInTheDocument();
    expect(screen.getByText("1 etiqueta lista para imprimir.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vista previa · 1 hoja" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cafe molido ya está elegido" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Imprimir 1 etiqueta" })[0]).toBeEnabled();
    await waitFor(() => expect(screen.getByAltText("QR COM000001")).toBeInTheDocument());
  });

  it("does not allow products without a code", () => {
    render(<ProductLabelPage initialParams={params} initialProducts={initialProducts} categories={[]} />);
    expect(screen.getByRole("button", { name: "Agregar Producto sin codigo" })).toBeDisabled();
    expect(screen.getByText("Sin código: agrégalo en Editar")).toBeInTheDocument();
  });

  it("changes the quantity from 1 to 100 per product", async () => {
    render(<ProductLabelPage initialParams={params} initialProducts={initialProducts} categories={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar Cafe molido" }));
    fireEvent.click(screen.getByRole("button", { name: "Una etiqueta más de Cafe molido" }));
    fireEvent.click(screen.getByRole("button", { name: "Una etiqueta más de Cafe molido" }));
    expect(screen.getByLabelText("Etiquetas de Cafe molido")).toHaveValue("3");
    fireEvent.change(screen.getByLabelText("Etiquetas de Cafe molido"), { target: { value: "250" } });
    expect(screen.getByLabelText("Etiquetas de Cafe molido")).toHaveValue("100");
    expect(screen.getByRole("button", { name: "Una etiqueta más de Cafe molido" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Quitar Cafe molido" }));
    expect(screen.getByRole("heading", { name: "Elegidos · 0" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Imprimir" })[0]).toBeDisabled());
  });

  it("shows how many labels fit per sheet and checks the margin", () => {
    render(<ProductLabelPage initialParams={params} initialProducts={initialProducts} categories={[]} />);
    expect(screen.getByText("8 columnas × 20 filas = 160 por hoja")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tamaño de etiqueta"), { target: { value: "50x30" } });
    expect(screen.getByText("3 columnas × 8 filas = 24 por hoja")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("A4 (21 × 29,7 cm)"));
    expect(screen.getByText(/por hoja$/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Margen (mm)"), { target: { value: "40" } });
    expect(screen.getByText("Un número de 0 a 30 mm")).toBeInTheDocument();
  });

  it("remembers the design on this device", () => {
    window.localStorage.removeItem("inventory.label-settings.v1");
    const { unmount } = render(<ProductLabelPage initialParams={params} initialProducts={initialProducts} categories={[]} />);
    fireEvent.change(screen.getByLabelText("Tamaño de etiqueta"), { target: { value: "60x40" } });
    unmount();
    render(<ProductLabelPage initialParams={params} initialProducts={initialProducts} categories={[]} />);
    expect(screen.getByLabelText("Tamaño de etiqueta")).toHaveValue("60x40");
    window.localStorage.removeItem("inventory.label-settings.v1");
  });

  it("arrives with the product chosen from its QR", async () => {
    render(
      <ProductLabelPage
        initialParams={params}
        initialProducts={initialProducts}
        categories={[]}
        initialSelected={[{ product: codedProduct, quantity: 1 }]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Elegidos · 1" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByAltText("QR COM000001")).toBeInTheDocument());
  });

  it("the phone goes step by step", () => {
    render(<ProductLabelPage initialParams={params} initialProducts={initialProducts} categories={[]} />);
    const steps = screen.getByRole("navigation", { name: "Pasos" });
    expect(within(steps).getByRole("button", { name: "1 · Productos" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Siguiente: diseño" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Agregar Cafe molido" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente: diseño" }));
    expect(within(steps).getByRole("button", { name: "2 · Diseño" })).toHaveAttribute("aria-current", "step");
    fireEvent.click(screen.getByRole("button", { name: "Siguiente: imprimir" }));
    expect(within(steps).getByRole("button", { name: "3 · Imprimir" })).toHaveAttribute("aria-current", "step");
  });

  it("exports the selected preview as SVG", async () => {
    const createObjectUrl = vi.fn(() => "blob:labels");
    let exportedBlob: Blob | undefined;
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        exportedBlob = blob;
        return createObjectUrl();
      }),
      revokeObjectURL: vi.fn(),
    });
    render(<ProductLabelPage initialParams={params} initialProducts={initialProducts} categories={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Agregar Cafe molido" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Descargar SVG" })[0]);

    await waitFor(() => expect(createObjectUrl).toHaveBeenCalled());
    const svg = exportedBlob ? await readBlobText(exportedBlob) : "";
    expect(svg).toContain('<svg x="0.8" y="0.8" width="8.4" height="8.4"');
    expect(svg).not.toContain('width="8.4" height="8.4" xmlns="http://www.w3.org/2000/svg" width=');
  });
});

function readBlobText(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}
