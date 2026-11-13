import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QrPreviewDialog } from "./QrPreviewDialog";
import { generateQrSvg } from "../qr";

vi.mock("../qr", () => ({
  generateQrSvg: vi.fn(),
  svgToDataUri: (svg: string) => `data:image/svg+xml,${svg}`,
  toQrFilename: (code: string) => code,
}));

describe("QrPreviewDialog", () => {
  beforeEach(() => {
    vi.mocked(generateQrSvg).mockReset();
  });

  it("shows a loading state while the QR is generated", async () => {
    vi.mocked(generateQrSvg).mockReturnValue(new Promise(() => {}));

    render(<QrPreviewDialog open code="QR-1" onClose={vi.fn()} />);

    expect(screen.getByText("Generando QR…")).toBeInTheDocument();
  });

  it("renders the generated QR image once ready", async () => {
    vi.mocked(generateQrSvg).mockResolvedValue("<svg>fake</svg>");

    render(<QrPreviewDialog open code="QR-1" onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByRole("img")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Descargar" })).toBeEnabled();
  });

  it("shows an error message when generation fails", async () => {
    vi.mocked(generateQrSvg).mockRejectedValue(new Error("boom"));

    render(<QrPreviewDialog open code="QR-1" onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("No se pudo generar el QR.")).toBeInTheDocument());
  });

  it("calls onClose when the dialog is dismissed", async () => {
    vi.mocked(generateQrSvg).mockResolvedValue("<svg>fake</svg>");
    const onClose = vi.fn();

    render(<QrPreviewDialog open code="QR-1" onClose={onClose} />);
    await waitFor(() => expect(screen.getByRole("img")).toBeInTheDocument());

    const { default: userEvent } = await import("@testing-library/user-event");
    const closeButtons = screen.getAllByRole("button", { name: "Cerrar" });
    await userEvent.setup().click(closeButtons[closeButtons.length - 1]);

    expect(onClose).toHaveBeenCalled();
  });

  it("links to Etiquetas with this product chosen", async () => {
    vi.mocked(generateQrSvg).mockResolvedValue("<svg>fake</svg>");
    render(<QrPreviewDialog open code="QR-LAC000004" productName="Yogur Frutilla" productId="p-1" onClose={vi.fn()} />);
    expect(screen.getByText("QR-LAC000004 · Yogur Frutilla")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Imprimir etiqueta/ })).toHaveAttribute("href", "/dashboard/products/labels?producto=p-1");
  });
});
