import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm, validateLogin } from "./LoginForm";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function signIn(email = "rosa@correo.com", password = "Clave123!") {
  await userEvent.type(screen.getByLabelText("Correo electrónico"), email);
  await userEvent.type(screen.getByLabelText("Contraseña"), password);
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("validateLogin", () => {
  it("pide correo y contraseña, y un correo con forma de correo", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({ email: "Escribe tu correo", password: "Escribe tu contraseña" });
    expect(validateLogin({ email: "rosa", password: "x" })).toEqual({ email: "Ese correo no es válido. Ej.: rosa@correo.com" });
  });
});

describe("LoginForm", () => {
  afterEach(() => {
    replace.mockReset();
    refresh.mockReset();
    vi.unstubAllGlobals();
  });

  it("muestra los errores antes de llamar al servidor", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByText("Escribe tu correo")).toHaveClass("text-status-danger");
    expect(screen.getByText("Escribe tu contraseña")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dice correo o contraseña incorrectos con 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ message: "Credenciales invalidas" }, 401)));
    render(<LoginForm />);

    await signIn();

    expect(await screen.findByText("Correo o contraseña incorrectos.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("dice que espere con 429", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ message: "Too many requests" }, 429)));
    render(<LoginForm />);

    await signIn();

    expect(await screen.findByText("Demasiados intentos. Espera unos minutos y vuelve a intentar.")).toBeInTheDocument();
  });

  it("el dueño va a Inicio", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ user: { role: "owner" } })));
    render(<LoginForm />);

    await signIn();

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("el cajero va a Vender si la caja está abierta", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(reply({ user: { role: "cashier" } })).mockResolvedValueOnce(reply({ status: "open" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginForm />);

    await signIn();

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard/pos"));
    expect(fetchMock.mock.calls[1][0]).toBe("/api/store-day/current");
  });

  it("el cajero va a Inicio si la caja está cerrada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(reply({ user: { role: "cashier" } })).mockResolvedValueOnce(reply({ status: "closed" })));
    render(<LoginForm />);

    await signIn();

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("ofrece recuperar la contraseña y entrar con Google", () => {
    render(<LoginForm />);

    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("button", { name: /continuar con google/i })).toBeInTheDocument();
  });

  it("deja ver la contraseña", async () => {
    render(<LoginForm />);
    const field = screen.getByLabelText("Contraseña");
    expect(field).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: /mostrar/i }));

    expect(field).toHaveAttribute("type", "text");
  });

  it.each([
    [{ sessionExpired: true }, "Tu sesión terminó. Vuelve a entrar."],
    [{ passwordReset: true }, "Contraseña actualizada. Entra con la nueva."],
    [{ verified: true }, "Correo confirmado. Ya puedes entrar."],
  ])("muestra el aviso %o", (props, text) => {
    render(<LoginForm {...props} />);

    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
