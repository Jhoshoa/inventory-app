import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginForm, validateLogin } from "./LoginForm";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

describe("validateLogin", () => {
  it("validates required fields", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({
      email: "Correo electrónico es requerido",
      password: "Contraseña es requerida",
    });
  });
});

describe("LoginForm", () => {
  it("shows validation errors before submit", async () => {
    render(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(screen.getByText("Correo electrónico es requerido")).toBeInTheDocument();
    expect(screen.getByText("Contraseña es requerida")).toBeInTheDocument();
    expect(screen.getByText("Correo electrónico es requerido")).toHaveClass("text-status-danger");
    expect(screen.getByText("Contraseña es requerida")).toHaveClass("text-status-danger");
  });

  it("shows invalid credentials errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "owner@example.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "secret1");
    await userEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(
      await screen.findByText("Credenciales invalidas o backend no disponible."),
    ).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
