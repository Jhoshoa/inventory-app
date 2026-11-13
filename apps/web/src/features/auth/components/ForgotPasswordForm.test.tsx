import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm, RESEND_COOLDOWN_SECONDS } from "./ForgotPasswordForm";

const fetchMock = vi.fn();
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const SENT = /Si ese correo tiene una cuenta, te llegó un enlace/;

async function submit(email: string, user = userEvent.setup()) {
  render(<ForgotPasswordForm />);
  if (email) await user.type(screen.getByLabelText("Correo electrónico"), email);
  await user.click(screen.getByRole("button", { name: /enviar enlace/i }));
  return user;
}

describe("ForgotPasswordForm", () => {
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("valida el correo antes de llamar al servidor", async () => {
    vi.stubGlobal("fetch", fetchMock);

    await submit("");
    expect(screen.getByText("Escribe tu correo")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "no-es-un-correo");
    await userEvent.click(screen.getByRole("button", { name: /enviar enlace/i }));
    expect(screen.getByText("Ese correo no es válido. Ej.: rosa@correo.com")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("muestra el mismo aviso exista o no la cuenta, con el correo y Spam", async () => {
    fetchMock.mockResolvedValueOnce(reply({ message: "lo que diga el servidor" }));
    vi.stubGlobal("fetch", fetchMock);

    await submit("dueno@tienda.com");

    expect(await screen.findByText(SENT)).toBeInTheDocument();
    expect(screen.getByText(/Spam/)).toBeInTheDocument();
    expect(screen.getByText("dueno@tienda.com")).toBeInTheDocument();
    expect(screen.queryByText("lo que diga el servidor")).not.toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "dueno@tienda.com" });
  });

  it("deja pedir otro enlace solo después de la espera", async () => {
    fetchMock.mockResolvedValue(reply({ message: "ok" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "dueno@tienda.com" } });

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: /enviar enlace/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByRole("button", { name: `Enviar otro en ${RESEND_COOLDOWN_SECONDS} s` })).toBeDisabled();

    for (let second = 0; second < RESEND_COOLDOWN_SECONDS; second += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    const ready = screen.getByRole("button", { name: "Enviar otro enlace" });
    expect(ready).toBeEnabled();

    fireEvent.click(ready);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: /enviar otro en/i })).toBeDisabled();
  });

  it("muestra el mensaje de demasiados intentos (429)", async () => {
    fetchMock.mockResolvedValueOnce(reply({ message: "Rate limited" }, 429));
    vi.stubGlobal("fetch", fetchMock);

    await submit("dueno@tienda.com");

    expect(await screen.findByText("Demasiados intentos. Espera unos minutos y vuelve a intentar.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar enlace/i })).toBeEnabled();
  });

  it("avisa si no hay conexión", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await submit("dueno@tienda.com");

    expect(await screen.findByText("No se pudo conectar con el servidor. Revisa tu conexión.")).toBeInTheDocument();
  });
});
