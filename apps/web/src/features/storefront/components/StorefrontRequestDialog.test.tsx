import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StorefrontRequestDialog } from "./StorefrontRequestDialog";
import { createStorefrontRequestAction } from "../requestActions";

vi.mock("../requestActions", () => ({
  createStorefrontRequestAction: vi.fn(),
}));

describe("StorefrontRequestDialog", () => {
  beforeEach(() => {
    vi.mocked(createStorefrontRequestAction).mockReset();
  });

  it("opens the dialog and shows validation errors", async () => {
    vi.mocked(createStorefrontRequestAction).mockResolvedValue({
      ok: false,
      message: "Corrige los errores del formulario",
      fieldErrors: { customerPhone: "Ingresa un telefono valido" },
    });
    const user = userEvent.setup();

    render(<StorefrontRequestDialog slug="mi-tienda" productId="prod-1" productName="Martillo" />);

    await user.click(screen.getByRole("button", { name: "Solicitar" }));
    await user.type(screen.getByLabelText("Tu nombre"), "Juan Perez");
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    expect(await screen.findByText("Ingresa un telefono valido")).toBeInTheDocument();
  });

  it("shows a confirmation and closes the form after a successful submission", async () => {
    vi.mocked(createStorefrontRequestAction).mockResolvedValue({
      ok: true,
      message: "Listo, la tienda te va a contactar pronto.",
      fieldErrors: {},
    });
    const user = userEvent.setup();

    render(<StorefrontRequestDialog slug="mi-tienda" productId="prod-1" productName="Martillo" />);

    await user.click(screen.getByRole("button", { name: "Solicitar" }));
    await user.type(screen.getByLabelText("Tu nombre"), "Juan Perez");
    await user.type(screen.getByLabelText("Tu telefono / WhatsApp"), "70011122");
    await user.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    expect(await screen.findByText(/dejamos tu pedido registrado/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Tu nombre")).not.toBeInTheDocument();
  });
});
