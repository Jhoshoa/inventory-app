import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PosProductSearch } from "./PosProductSearch";

vi.mock("./PosCameraScanner", () => ({
  PosCameraScanner: ({ open, onDetected }: { open: boolean; onDetected: (code: string) => void }) =>
    open ? (
      <button type="button" onClick={() => onDetected("QR-1")}>
        Simular lectura
      </button>
    ) : null,
}));

const product = {
  id: "product-1",
  name: "Arroz 1kg",
  price: "12.50",
  stock: 5,
  unit: "unidad",
  qr_code: "QR-1",
  discount_type: null,
  discount_value: "0",
  effective_price: "12.50",
};

describe("PosProductSearch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
  });

  it("hides the camera button when the browser has no camera API", () => {
    render(<PosProductSearch onAdd={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Escanear" })).not.toBeInTheDocument();
  });

  it("adds the product read by the camera without refocusing the input", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => product,
    } as Response);

    render(<PosProductSearch onAdd={onAdd} />);

    const input = screen.getByRole("textbox", { name: "Buscar producto" });
    await user.click(await screen.findByRole("button", { name: "Escanear" }));
    await user.click(screen.getByRole("button", { name: "Simular lectura" }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith({ ...product, locations: [] }));
    expect(fetchMock).toHaveBeenCalledWith("/api/products/qr/QR-1", expect.anything());
    expect(screen.queryByRole("button", { name: "Simular lectura" })).not.toBeInTheDocument();
    await waitFor(() => expect(input).toHaveValue(""));
    expect(input).not.toHaveFocus();
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

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith({ ...product, locations: [] }));
    await waitFor(() => expect(input).toHaveValue(""));
    await waitFor(() => expect(input).toHaveFocus());
  });
});
