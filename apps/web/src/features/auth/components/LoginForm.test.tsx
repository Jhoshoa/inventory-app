import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { LoginForm, validateLogin } from "./LoginForm";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: (...a: unknown[]) => toastSuccess(...a), error: (...a: unknown[]) => toastError(...a) }),
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

    await vi.waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Credenciales invalidas o backend no disponible.");
    });

    vi.unstubAllGlobals();
  });

  it("ofrece recuperar la contraseña", () => {
    render(<LoginForm />);

    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("avisa cuando la sesión expiró", () => {
    render(<LoginForm sessionExpired />);

    expect(toast).toHaveBeenCalledWith("Tu sesión expiró. Inicia sesión nuevamente.");
  });

  it("confirma el cambio de contraseña", () => {
    render(<LoginForm passwordReset />);

    expect(toastSuccess).toHaveBeenCalledWith("Contraseña actualizada. Inicia sesión con la nueva.");
  });
});
