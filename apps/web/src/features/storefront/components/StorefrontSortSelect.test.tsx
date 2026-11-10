import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StorefrontSortSelect } from "./StorefrontSortSelect";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
  usePathname: () => "/t/mi-tienda",
  useSearchParams: () => new URLSearchParams(),
}));

describe("StorefrontSortSelect", () => {
  it("navigates preserving the search query and category filter", async () => {
    const user = userEvent.setup();
    mocks.push.mockClear();

    render(<StorefrontSortSelect slug="mi-tienda" q="arroz" categoryId="cat-1" sort="name" />);

    await user.selectOptions(screen.getByRole("combobox"), "price_asc");

    expect(mocks.push).toHaveBeenCalledWith("/t/mi-tienda?q=arroz&category=cat-1&sort=price_asc");
  });

  it("omits the sort param entirely when going back to the default (name)", async () => {
    const user = userEvent.setup();
    mocks.push.mockClear();

    render(<StorefrontSortSelect slug="mi-tienda" sort="price_desc" />);

    await user.selectOptions(screen.getByRole("combobox"), "name");

    expect(mocks.push).toHaveBeenCalledWith("/t/mi-tienda");
  });

  it("offers the most ordered products as an order", async () => {
    const user = userEvent.setup();
    mocks.push.mockClear();

    render(<StorefrontSortSelect slug="mi-tienda" sort="name" />);

    expect(screen.getByRole("option", { name: "Mas pedidos" })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox"), "popular");

    expect(mocks.push).toHaveBeenCalledWith("/t/mi-tienda?sort=popular");
  });

  it("writes name in the URL when the store's default order is another one", async () => {
    const user = userEvent.setup();
    mocks.push.mockClear();

    render(<StorefrontSortSelect slug="mi-tienda" sort="price_asc" defaultSort="price_asc" />);

    await user.selectOptions(screen.getByRole("combobox"), "name");

    expect(mocks.push).toHaveBeenCalledWith("/t/mi-tienda?sort=name");
  });
});

describe("StorefrontSortSelect inside the catalog", () => {
  it("changes the order without reloading or scrolling to the top", async () => {
    const { CatalogNavigationProvider } = await import("../templates/CatalogNavigation");
    const user = userEvent.setup();
    mocks.push.mockClear();

    render(
      <CatalogNavigationProvider>
        <StorefrontSortSelect slug="mi-tienda" sort="name" />
      </CatalogNavigationProvider>,
    );
    await user.selectOptions(screen.getByRole("combobox"), "price_asc");

    expect(mocks.push).toHaveBeenCalledWith("/t/mi-tienda?sort=price_asc", { scroll: false });
  });
});
