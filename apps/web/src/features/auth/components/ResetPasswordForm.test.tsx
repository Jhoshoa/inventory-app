import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordForm, readRecoveryToken } from "./ResetPasswordForm";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const fetchMock = vi.fn();
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const GOOD_PASSWORD = "NuevaClave1!";

function openLink(hash: string) {
  window.history.replaceState(null, "", `/reset-password${hash}`);
}

async function fillAndSubmit(password: string, confirmation = password) {
  await userEvent.type(screen.getByLabelText("Nueva contraseña"), password);
  await userEvent.type(screen.getByLabelText("Confirmar contraseña"), confirmation);
  await userEvent.click(screen.getByRole("button", { name: /guardar contraseña/i }));
}

describe("readRecoveryToken", () => {
  it("lee el token de un enlace de recuperación", () => {
    expect(readRecoveryToken("#access_token=abc.def.ghi&refresh_token=r&type=recovery")).toBe("abc.def.ghi");
  });

  it.each([
    ["sin fragmento", ""],
    ["otro tipo de enlace (confirmación de email)", "#access_token=abc&type=signup"],
    ["enlace vencido según Supabase", "#error=access_denied&error_code=otp_expired&error_description=expired"],
    ["sin token", "#type=recovery"],
  ])("devuelve null: %s", (_label, hash) => {
    expect(readRecoveryToken(hash)).toBeNull();
  });
});

describe("ResetPasswordForm", () => {
  beforeEach(() => vi.stubGlobal("fetch", fetchMock));

  afterEach(() => {
    fetchMock.mockReset();
    replace.mockReset();
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
  });

  it("borra el token de la barra de direcciones apenas lo lee", async () => {
    openLink("#access_token=tok.en.123&type=recovery");

    render(<ResetPasswordForm />);

    expect(await screen.findByLabelText("Nueva contraseña")).toBeInTheDocument();
    expect(window.location.hash).toBe("");
  });

  it("sigue funcionando bajo StrictMode (los efectos corren dos veces en desarrollo)", async () => {
    openLink("#access_token=tok.en.123&type=recovery");

    render(
      <StrictMode>
        <ResetPasswordForm />
      </StrictMode>,
    );

    expect(await screen.findByLabelText("Nueva contraseña")).toBeInTheDocument();
  });

  it("ofrece pedir un enlace nuevo si el enlace no es válido", async () => {
    openLink("#error=access_denied&error_code=otp_expired");

    render(<ResetPasswordForm />);

    expect(await screen.findByText(/El enlace expiró o no es válido/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /solicitar un enlace nuevo/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("no llama al servidor si la contraseña es débil o no coincide", async () => {
    openLink("#access_token=tok.en.123&type=recovery");
    render(<ResetPasswordForm />);
    await screen.findByLabelText("Nueva contraseña");

    await fillAndSubmit("debil");
    expect(screen.getByText("La contraseña debe tener al menos 8 caracteres")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Nueva contraseña"));
    await userEvent.clear(screen.getByLabelText("Confirmar contraseña"));
    await fillAndSubmit(GOOD_PASSWORD, "OtraDistinta1!");
    expect(screen.getByText("Las contraseñas no coinciden")).toBeInTheDocument();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envía el token y la contraseña nueva y vuelve al login con aviso", async () => {
    fetchMock.mockResolvedValueOnce(reply({ message: "ok" }));
    openLink("#access_token=tok.en.123&type=recovery");
    render(<ResetPasswordForm />);
    await screen.findByLabelText("Nueva contraseña");

    await fillAndSubmit(GOOD_PASSWORD);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/login?reset=success"));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/reset-password");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      access_token: "tok.en.123",
      password: GOOD_PASSWORD,
    });
  });

  it("si el servidor dice que el enlace venció, pasa a la pantalla de enlace inválido", async () => {
    fetchMock.mockResolvedValueOnce(reply({ message: "El enlace expiro" }, 401));
    openLink("#access_token=tok.en.123&type=recovery");
    render(<ResetPasswordForm />);
    await screen.findByLabelText("Nueva contraseña");

    await fillAndSubmit(GOOD_PASSWORD);

    expect(await screen.findByText(/El enlace expiró o no es válido/)).toBeInTheDocument();
  });

  it("muestra el motivo cuando el servidor rechaza la contraseña (p. ej. igual a la anterior)", async () => {
    fetchMock.mockResolvedValueOnce(
      reply({ message: "La nueva contrasena debe ser diferente a la anterior." }, 400),
    );
    openLink("#access_token=tok.en.123&type=recovery");
    render(<ResetPasswordForm />);
    await screen.findByLabelText("Nueva contraseña");

    await fillAndSubmit(GOOD_PASSWORD);

    expect(await screen.findByText(/debe ser diferente a la anterior/)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
