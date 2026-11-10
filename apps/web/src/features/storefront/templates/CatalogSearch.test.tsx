import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogLink, CatalogNavigationProvider, CatalogResults } from "./CatalogNavigation";
import { CatalogSearch } from "./CatalogSearch";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/t/tienda",
  useSearchParams: () => new URLSearchParams(),
}));

function renderSearch(props: Partial<Parameters<typeof CatalogSearch>[0]> = {}) {
  return render(
    <CatalogNavigationProvider>
      <CatalogSearch
        slug="tienda"
        sort="name"
        defaultSort="name"
        placeholder="Buscar producto…"
        formClassName=""
        inputClassName=""
        buttonClassName=""
        {...props}
      />
      <CatalogLink href="/t/tienda?category=c-1">Lacteos</CatalogLink>
      <CatalogResults>
        <p>productos</p>
      </CatalogResults>
    </CatalogNavigationProvider>,
  );
}

describe("CatalogSearch", () => {
  beforeEach(() => {
    router.push.mockReset();
    router.replace.mockReset();
  });

  it("searches by itself after the customer stops typing, without reloading or scrolling", async () => {
    const user = userEvent.setup();
    renderSearch({ category: "c-1" });

    await user.type(screen.getByRole("searchbox"), "leche");

    await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(router.replace).toHaveBeenCalledWith("/t/tienda?q=leche&category=c-1", { scroll: false });
  });

  it("does not search with a single letter", async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(screen.getByRole("searchbox"), "l");
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("searches right away with the button, which mobile users can tap", async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(screen.getByRole("searchbox"), "queso");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(router.push).toHaveBeenCalledWith("/t/tienda?q=queso", { scroll: false });
    expect(screen.getByRole("searchbox")).toHaveAttribute("enterkeyhint", "search");
  });

  it("clears the search when the field is emptied", async () => {
    const user = userEvent.setup();
    renderSearch({ q: "leche" });

    await user.clear(screen.getByRole("searchbox"));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/t/tienda", { scroll: false }), { timeout: 2000 });
  });

  it("category links navigate on the client and keep the scroll", async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.click(screen.getByRole("link", { name: "Lacteos" }));

    expect(router.push).toHaveBeenCalledWith("/t/tienda?category=c-1", { scroll: false });
    // Hasta que la URL cambie, la grilla se muestra "buscando".
    expect(screen.getByText("productos").parentElement).toHaveAttribute("aria-busy", "true");
  });
});
