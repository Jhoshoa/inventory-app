import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegisterForm, validateRegister } from "./RegisterForm";

const replace = vi.fn();
const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh, push }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function fill(password = "Clave123!") {
  await userEvent.type(screen.getByLabelText("Nombre de la tienda"), "Tienda Rosa");
  await userEvent.type(screen.getByLabelText("Tu nombre"), "Rosa Quispe");
  await userEvent.type(screen.getByLabelText("Correo electrónico"), "rosa@correo.com");
  await userEvent.type(screen.getByLabelText("Contraseña"), password);
}

describe("validateRegister", () => {
  it("pide cada dato", () => {
    expect(validateRegister({ store_name: " ", full_name: "", email: "x", password: "abc" })).toEqual({
      store_name: "Escribe el nombre de tu tienda",
      full_name: "Escribe tu nombre",
      email: "Ese correo no es válido. Ej.: rosa@correo.com",
      password: "La contraseña todavía no cumple los requisitos",
    });
  });
});

describe("RegisterForm", () => {
  afterEach(() => {
    replace.mockReset();
    vi.unstubAllGlobals();
  });

  it("marca los requisitos mientras se escribe y activa el botón al cumplirlos", async () => {
    render(<RegisterForm />);
    const submit = screen.getByRole("button", { name: "Crear mi tienda" });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Contraseña"), "clave");
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Contraseña"), "A1!x");
    expect(submit).toBeEnabled();
    expect(screen.getByRole("list", { name: "Requisitos de la contraseña" })).toBeInTheDocument();
  });

  it("crea la tienda y entra directo cuando la API devuelve la sesión", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply({ user: { role: "owner" } }, 201));
    vi.stubGlobal("fetch", fetchMock);
    render(<RegisterForm />);

    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Crear mi tienda" }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      store_name: "Tienda Rosa",
      full_name: "Rosa Quispe",
      email: "rosa@correo.com",
      password: "Clave123!",
    });
  });

  it("pide confirmar el correo cuando la API no devuelve sesión", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ message: "ok" }, 201)));
    render(<RegisterForm />);

    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Crear mi tienda" }));

    expect(await screen.findByText(/Revisa tu correo para confirmar la cuenta/)).toBeInTheDocument();
    expect(screen.getByText("rosa@correo.com")).toBeInTheDocument();
  });

  it("muestra el motivo del servidor y el de demasiados intentos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(reply({ message: "Ese correo ya tiene una cuenta" }, 409)).mockResolvedValueOnce(reply({}, 429)));
    render(<RegisterForm />);

    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Crear mi tienda" }));
    expect(await screen.findByText("Ese correo ya tiene una cuenta")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Crear mi tienda" }));
    expect(await screen.findByText("Demasiados intentos. Espera unos minutos y vuelve a intentar.")).toBeInTheDocument();
  });
});
