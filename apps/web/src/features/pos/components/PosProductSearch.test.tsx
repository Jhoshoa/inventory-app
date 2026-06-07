import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PosProductSearch } from "./PosProductSearch";

const product = {
  id: "product-1",
  name: "Arroz 1kg",
  price: "12.50",
  stock: 5,
  unit: "unidad",
  qr_code: "QR-1",
};

describe("PosProductSearch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds scanned products, clears the input, and keeps focus in search", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => product,
    } as Response);

    render(<PosProductSearch onAdd={onAdd} />);

    const input = screen.getByRole("textbox", { name: "Buscar producto" });
    await user.type(input, "QR-1{Enter}");

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(product));
    await waitFor(() => expect(input).toHaveValue(""));
    await waitFor(() => expect(input).toHaveFocus());
  });
});
