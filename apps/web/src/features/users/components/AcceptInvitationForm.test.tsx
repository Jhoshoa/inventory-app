import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AcceptInvitationForm, invitationErrorMessage } from "./AcceptInvitationForm";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));

const acceptInvitationAction = vi.fn();
vi.mock("../actions", () => ({ acceptInvitationAction: (...args: unknown[]) => acceptInvitationAction(...args) }));

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function join(name = "Ana Mamani", password = "Clave123!") {
  if (name) await userEvent.type(screen.getByLabelText("Tu nombre"), name);
  await userEvent.type(screen.getByLabelText("Crea una contraseña"), password);
  await userEvent.click(screen.getByRole("button", { name: "Unirme a la tienda" }));
}

describe("AcceptInvitationForm", () => {
  afterEach(() => {
    acceptInvitationAction.mockReset();
    replace.mockReset();
    vi.unstubAllGlobals();
  });

  it("muestra el correo invitado sin dejar cambiarlo y marca los requisitos", async () => {
    render(<AcceptInvitationForm token="tok" email="ana@correo.com" role="cashier" />);

    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@correo.com");
    expect(screen.getByLabelText("Correo electrónico")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Unirme a la tienda" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Crea una contraseña"), "Clave123!");
    expect(screen.getByRole("button", { name: "Unirme a la tienda" })).toBeEnabled();
  });

  it("el cajero entra a Vender si la caja está abierta", async () => {
    acceptInvitationAction.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ status: "open" })));
    render(<AcceptInvitationForm token="tok" email="ana@correo.com" role="cashier" />);

    await join();

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard/pos"));
    const [token, , data] = acceptInvitationAction.mock.calls[0] as [string, unknown, FormData];
    expect(token).toBe("tok");
    expect(data.get("full_name")).toBe("Ana Mamani");
    expect(data.get("password")).toBe("Clave123!");
  });

  it("el dueño invitado entra a Inicio", async () => {
    acceptInvitationAction.mockResolvedValue({ ok: true });
    render(<AcceptInvitationForm token="tok" email="ana@correo.com" role="owner" />);

    await join();

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("muestra el error del campo y lleva el foco ahí", async () => {
    acceptInvitationAction.mockResolvedValue({ ok: false, message: "Corrige", fieldErrors: { full_name: "Escribe tu nombre" } });
    render(<AcceptInvitationForm token="tok" email="ana@correo.com" role="cashier" />);

    await join("");

    expect(await screen.findByText("Escribe tu nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Tu nombre")).toHaveFocus();
    expect(screen.queryByText("Corrige")).not.toBeInTheDocument();
  });

  it("muestra el motivo cuando la invitación ya no sirve", async () => {
    acceptInvitationAction.mockResolvedValue({ ok: false, message: "La invitacion expiro", fieldErrors: {} });
    render(<AcceptInvitationForm token="tok" email="ana@correo.com" role="cashier" />);

    await join();

    expect(await screen.findByText("Esta invitación ya no es válida. Pídele a la tienda que te envíe otra.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("traduce cada motivo de la API", () => {
    expect(invitationErrorMessage("Esta invitacion ya fue utilizada")).toMatch(/ya se usó/);
    expect(invitationErrorMessage("Este email ya pertenece a un usuario existente")).toMatch(/ya tiene una cuenta/);
    expect(invitationErrorMessage("Esta invitacion ha expirado")).toMatch(/ya no es válida/);
    expect(invitationErrorMessage("Sin conexión")).toBe("Sin conexión");
  });
});
