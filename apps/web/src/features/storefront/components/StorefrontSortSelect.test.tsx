import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StorefrontSortSelect } from "./StorefrontSortSelect";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
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
});
