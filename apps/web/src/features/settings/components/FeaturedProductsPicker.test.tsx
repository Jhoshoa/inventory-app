import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeaturedProductsPicker } from "./FeaturedProductsPicker";

const product = (id: string, name: string, stock = 5) => ({ id, name, price: "10.00", stock });

function hiddenIds() {
  return [...document.querySelectorAll<HTMLInputElement>('input[name="featured"]')].map((i) => i.value);
}

describe("FeaturedProductsPicker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("explains the fallback when nothing is chosen", () => {
    render(<FeaturedProductsPicker name="featured" initialProducts={[]} />);

    expect(screen.getByText(/el carrusel muestra tus productos en oferta/)).toBeInTheDocument();
  });

  it("searches products and adds them once, in order", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [product("p-1", "Leche Pil 1l"), product("p-2", "Leche Deslactosada")] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<FeaturedProductsPicker name="featured" initialProducts={[]} />);

    await user.type(screen.getByLabelText("Buscar producto para destacar"), "leche");
    await user.click(await screen.findByRole("button", { name: /Leche Deslactosada/ }));
    await user.click(screen.getByRole("button", { name: /Leche Pil 1l/ }));

    expect(fetchMock.mock.calls[0][0]).toContain("/api/products/pos?q=leche");
    expect(hiddenIds()).toEqual(["p-2", "p-1"]);
    expect(screen.getByRole("button", { name: /Leche Pil 1l.*Agregado/ })).toBeDisabled();
  });

  it("does not search with fewer than three letters", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<FeaturedProductsPicker name="featured" initialProducts={[]} />);

    await user.type(screen.getByLabelText("Buscar producto para destacar"), "le");

    expect(screen.getByText("Escribe al menos 3 letras.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reorders and removes the chosen products", async () => {
    const user = userEvent.setup();
    render(
      <FeaturedProductsPicker
        name="featured"
        initialProducts={[product("a", "Arroz"), product("b", "Queso", 0), product("c", "Pan")]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Subir Pan" }));
    expect(hiddenIds()).toEqual(["a", "c", "b"]);

    await user.click(screen.getByRole("button", { name: "Quitar Arroz" }));
    expect(hiddenIds()).toEqual(["c", "b"]);
    expect(screen.getByRole("button", { name: "Subir Pan" })).toBeDisabled();
    expect(within(screen.getByRole("list")).getByText(/Agotado/)).toBeInTheDocument();
  });

  it("stops offering the search at ten products", () => {
    render(
      <FeaturedProductsPicker
        name="featured"
        initialProducts={Array.from({ length: 10 }, (_, i) => product(`p-${i}`, `Producto ${i}`))}
      />,
    );

    expect(screen.queryByLabelText("Buscar producto para destacar")).not.toBeInTheDocument();
    expect(screen.getByText(/máximo de 10 productos/)).toBeInTheDocument();
  });
});
