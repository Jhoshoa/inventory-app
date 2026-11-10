import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogNavigationProvider } from "./CatalogNavigation";
import { type CategoryOption, CategoryPicker } from "./CategoryPicker";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/t/tienda",
  useSearchParams: () => new URLSearchParams(),
}));

const NAMES = ["Abarrotes", "Bebidas", "Lacteos", "Limpieza", "Snacks", "Panaderia", "Carnes", "Frutas", "Verduras", "Congelados", "Mascotas", "Bebes"];

function options(count: number, activeIndex?: number): CategoryOption[] {
  return NAMES.slice(0, count).map((name, index) => ({
    id: `c-${index}`,
    name,
    count: index + 1,
    href: `/t/tienda?category=c-${index}`,
    active: index === activeIndex,
  }));
}

function renderPicker(items: CategoryOption[]) {
  return render(
    <CatalogNavigationProvider>
      <CategoryPicker
        mode="link"
        variant="vitrina"
        themeVars={{}}
        fontClassName=""
        allItem={{ href: "/t/tienda", active: !items.some((i) => i.active) }}
        items={items}
      />
    </CatalogNavigationProvider>,
  );
}

describe("CategoryPicker", () => {
  beforeEach(() => router.push.mockReset());

  it("shows up to 4 categories as wrapping chips, with no list button", () => {
    renderPicker(options(4));

    expect(screen.queryByRole("button", { name: /Categoria:/ })).not.toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Categorias" });
    expect(nav.className).toContain("flex-wrap");
    expect(nav.className).not.toContain("overflow-x-auto");
    expect(within(nav).getAllByRole("link")).toHaveLength(5);
  });

  it("with more than 4, phones get one button that opens the list", async () => {
    const user = userEvent.setup();
    renderPicker(options(6, 2));

    const trigger = screen.getByRole("button", { name: /Categoria: Lacteos/ });
    expect(trigger.className).toContain("sm:hidden");
    expect(screen.getByRole("navigation", { name: "Categorias" }).className).toContain("hidden sm:flex");

    await user.click(trigger);
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("link", { name: "Todas" })).toBeInTheDocument();
    await user.click(within(sheet).getByRole("link", { name: /Snacks/ }));

    expect(router.push).toHaveBeenCalledWith("/t/tienda?category=c-4", { scroll: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("on large screens shows 7 chips and the rest under +N mas", () => {
    renderPicker(options(12));

    expect(screen.getByRole("button", { name: "+5 mas" })).toBeInTheDocument();
    const hiddenOnDesktop = within(screen.getByRole("navigation", { name: "Categorias" }))
      .getAllByRole("link")
      .filter((link) => link.className.includes("sm:hidden"));
    expect(hiddenOnDesktop).toHaveLength(5);
  });

  it("keeps the active category visible on large screens even if it is one of the extra ones", () => {
    renderPicker(options(12, 10));

    const mascotas = screen.getByRole("link", { name: /^Mascotas/ });
    expect(mascotas.className).not.toContain("sm:hidden");
  });

  it("filters the list when there are many categories", async () => {
    const user = userEvent.setup();
    renderPicker(options(12));

    await user.click(screen.getByRole("button", { name: /Categoria: Categorias/ }));
    const sheet = screen.getByRole("dialog");
    await user.type(within(sheet).getByLabelText("Buscar categoria"), "car");

    const links = within(sheet).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Carnes7"]);
  });
});
