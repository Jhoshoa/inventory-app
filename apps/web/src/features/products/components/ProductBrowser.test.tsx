import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductBrowser } from "./ProductBrowser";
import type { Product, ProductListResponse, ProductSearchParams } from "../types";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
}));

const emptyProducts: ProductListResponse = { items: [], limit: 50, offset: 0, total: 0 };
const initialParams: ProductSearchParams = { direction: "asc", limit: 50, offset: 0, sort: "name", stock: "all" };

const milk = {
  id: "p-1",
  name: "Leche Pil 1l",
  price: "7.50",
  effective_price: "7.50",
  stock: 9,
  min_stock: 2,
  unit: "unidad",
  category: "Lácteos",
  sku: "LAC000001",
  qr_code: "7751234",
  photo_url: null,
  locations: [],
} as unknown as Product;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("ProductBrowser", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    push.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/");
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("an empty store invites the owner to add or import products", () => {
    render(<ProductBrowser initialParams={initialParams} initialProducts={emptyProducts} role="owner" />);
    expect(screen.getByText("Agrega tu primer producto")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nuevo producto" })).toHaveAttribute("href", "/dashboard/products/new");
    expect(screen.getByRole("button", { name: "Importar CSV" })).toBeInTheDocument();
  });

  it("the cashier sees a plain empty state", () => {
    render(<ProductBrowser initialParams={initialParams} initialProducts={emptyProducts} role="cashier" />);
    expect(screen.getByText("Todavía no hay productos")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nuevo producto" })).not.toBeInTheDocument();
  });

  it("no results with filters offers to clear them", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...emptyProducts, total: 1, items: [milk] }));
    render(
      <ProductBrowser initialParams={{ ...initialParams, stock: "low" }} initialProducts={emptyProducts} role="owner" />,
    );
    expect(screen.getByText("Ningún producto con estos filtros")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("stock=all"), expect.anything()));
    expect(await screen.findAllByText("Leche Pil 1l")).not.toHaveLength(0);
    expect(window.location.search).toBe("");
  });

  it("filters fetch the list and go into the URL", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...emptyProducts, total: 1, items: [milk] }));
    render(<ProductBrowser initialParams={initialParams} initialProducts={{ ...emptyProducts, total: 1, items: [milk] }} role="owner" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Stock bajo" })[0]);
    expect(screen.getByLabelText("Cargando productos")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("stock=low"), expect.anything()));
    await waitFor(() => expect(window.location.search).toBe("?stock=low"));
    await waitFor(() => expect(screen.queryByLabelText("Cargando productos")).not.toBeInTheDocument());
  });

  it("searches 400 ms after typing 3 letters", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(jsonResponse(emptyProducts));
    render(<ProductBrowser initialParams={initialParams} initialProducts={{ ...emptyProducts, total: 1, items: [milk] }} role="owner" />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "le" } });
    await act(async () => vi.advanceTimersByTime(500));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "lec" } });
    await act(async () => vi.advanceTimersByTime(399));
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("q=lec"), expect.anything());
  });

  it("an exact code with Enter opens the product", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "p-1" }));
    render(<ProductBrowser initialParams={initialParams} initialProducts={{ ...emptyProducts, total: 1, items: [milk] }} role="cashier" />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "7751234" } });
    fireEvent.submit(screen.getByRole("search"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard/products/p-1"));
    expect(fetchMock).toHaveBeenCalledWith("/api/products/qr/7751234");
    // La búsqueda por texto pendiente no corre (pisaría la navegación al producto).
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");
  });

  it("Enter with a name that is not a code searches right away", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.startsWith("/api/products/qr/") ? jsonResponse({ detail: "no" }, 404) : jsonResponse(emptyProducts),
    );
    render(<ProductBrowser initialParams={initialParams} initialProducts={{ ...emptyProducts, total: 1, items: [milk] }} role="owner" />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "yogur" } });
    fireEvent.submit(screen.getByRole("search"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("q=yogur"), expect.anything()));
    expect(push).not.toHaveBeenCalled();
  });

  it("a failed load can be retried", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "Fallo del servidor" }, 500));
    render(<ProductBrowser initialParams={initialParams} initialProducts={{ ...emptyProducts, total: 1, items: [milk] }} role="owner" />);
    fireEvent.click(screen.getAllByRole("button", { name: "Sin stock" })[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar los productos");
    fetchMock.mockResolvedValueOnce(jsonResponse({ ...emptyProducts, total: 1, items: [milk] }));
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("takes the refreshed list from the server after adjusting stock", () => {
    const { rerender } = render(
      <ProductBrowser initialParams={initialParams} initialProducts={{ ...emptyProducts, total: 1, items: [milk] }} role="owner" />,
    );
    expect(screen.getAllByText("9 u.").length).toBeGreaterThan(0);
    rerender(
      <ProductBrowser
        initialParams={{ ...initialParams }}
        initialProducts={{ ...emptyProducts, total: 1, items: [{ ...milk, stock: 14 }] }}
        role="owner"
      />,
    );
    expect(screen.getAllByText("14 u.").length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refetches when the refreshed server list is for other filters", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...emptyProducts, total: 1, items: [milk] }));
    const { rerender } = render(
      <ProductBrowser initialParams={{ ...initialParams, stock: "low" }} initialProducts={{ ...emptyProducts, total: 1, items: [milk] }} role="owner" />,
    );
    rerender(<ProductBrowser initialParams={initialParams} initialProducts={emptyProducts} role="owner" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("stock=low"), expect.anything()));
    await waitFor(() => expect(screen.queryByLabelText("Cargando productos")).not.toBeInTheDocument());
    expect(screen.getAllByText("Leche Pil 1l").length).toBeGreaterThan(0);
  });
});
