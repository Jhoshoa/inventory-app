import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorePaymentQrUploader } from "./StorePaymentQrUploader";

function makePngFile(name = "qr.png") {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });
}

describe("StorePaymentQrUploader", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the upload prompt when there is no QR yet", () => {
    render(<StorePaymentQrUploader currentUrl={null} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Subir foto de tu QR de pago")).toBeInTheDocument();
  });

  it("uploads a file and calls onChange with the new URL", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ storefront_payment_qr_url: "https://res.cloudinary.com/demo/qr.png" }),
    } as Response);
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<StorePaymentQrUploader currentUrl={null} onChange={onChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, makePngFile());

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("https://res.cloudinary.com/demo/qr.png"));
    expect(fetch).toHaveBeenCalledWith("/api/store/payment-qr", expect.objectContaining({ method: "POST" }));
    expect(await screen.findByAltText("QR de pago")).toBeInTheDocument();
  });

  it("shows an error and keeps idle state when the upload fails", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ error: "internal_server_error", detail: "cloud_name is disabled" }),
    } as Response);
    const user = userEvent.setup();

    render(<StorePaymentQrUploader currentUrl={null} onChange={vi.fn()} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, makePngFile());

    expect(await screen.findByText(/cloud_name is disabled/i)).toBeInTheDocument();
  });

  it("removes an existing QR", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ storefront_payment_qr_url: null }),
    } as Response);
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<StorePaymentQrUploader currentUrl="https://res.cloudinary.com/demo/qr.png" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Quitar" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null));
    expect(fetch).toHaveBeenCalledWith("/api/store/payment-qr", expect.objectContaining({ method: "DELETE" }));
  });
});
