import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

const fetchMock = vi.fn();
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function submit(email: string) {
  render(<ForgotPasswordForm />);
  if (email) await userEvent.type(screen.getByLabelText("Correo electrónico"), email);
  await userEvent.click(screen.getByRole("button", { name: /enviar enlace/i }));
}

describe("ForgotPasswordForm", () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("valida el correo antes de llamar al servidor", async () => {
    vi.stubGlobal("fetch", fetchMock);

    await submit("");
    expect(screen.getByText("Correo electrónico es requerido")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "no-es-un-correo");
    await userEvent.click(screen.getByRole("button", { name: /enviar enlace/i }));
    expect(screen.getByText("Correo electrónico inválido")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("muestra la confirmación genérica que devuelve el servidor", async () => {
    fetchMock.mockResolvedValueOnce(reply({ message: "Si el correo tiene una cuenta, te enviamos un enlace." }));
    vi.stubGlobal("fetch", fetchMock);

    await submit("dueno@tienda.com");

    expect(await screen.findByText("Si el correo tiene una cuenta, te enviamos un enlace.")).toBeInTheDocument();
    expect(screen.getByText(/carpeta de spam/i)).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "dueno@tienda.com" });
  });

  it("muestra el aviso del servidor cuando hay demasiados intentos", async () => {
    fetchMock.mockResolvedValueOnce(
      reply({ message: "Demasiados intentos. Intenta nuevamente en unos minutos." }, 429),
    );
    vi.stubGlobal("fetch", fetchMock);

    await submit("dueno@tienda.com");

    expect(await screen.findByText(/Demasiados intentos/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar enlace/i })).toBeEnabled();
  });

  it("avisa si no hay conexión", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await submit("dueno@tienda.com");

    expect(await screen.findByText("No se pudo conectar con el servidor.")).toBeInTheDocument();
  });
});
