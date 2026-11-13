import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { inviteCashierAction, revokeInvitationAction, updateUserRoleAction, updateUserStatusAction } from "../actions";
import type { UserInvitationResponse, UserResponse } from "../types";
import { UsersManager } from "./UsersManager";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../actions", () => ({
  inviteCashierAction: vi.fn(),
  resendInvitationAction: vi.fn(),
  revokeInvitationAction: vi.fn(),
  updateUserRoleAction: vi.fn(),
  updateUserStatusAction: vi.fn(),
}));

const users: UserResponse[] = [
  { id: "u-2", email: "luis@correo.com", store_id: "s", full_name: "Luis Mamani", role: "cashier", is_active: true, last_login_at: "2026-11-12T15:30:00Z" },
  { id: "u-1", email: "dueno@local.test", store_id: "s", full_name: "Rosa Quispe", role: "owner", is_active: true, last_login_at: new Date().toISOString() },
];
const invitations: UserInvitationResponse[] = [
  {
    id: "i-1",
    store_id: "s",
    email: "ana@correo.com",
    role: "cashier",
    status: "pending",
    expires_at: new Date(Date.now() + 6 * 86_400_000 - 60_000).toISOString(),
    invited_by_user_id: "u-1",
    accepted_by_user_id: null,
    created_at: null,
    accepted_at: null,
    revoked_at: null,
    last_sent_at: null,
    send_count: 1,
  },
];

describe("UsersManager", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.mocked(updateUserRoleAction).mockReset();
    vi.mocked(updateUserStatusAction).mockReset();
    vi.mocked(revokeInvitationAction).mockReset();
    vi.mocked(inviteCashierAction).mockReset();
  });

  it("lists me first, the others with their role and the pending invitation", () => {
    render(<UsersManager users={users} invitations={invitations} currentUserId="u-1" />);
    const rows = within(screen.getByRole("region", { name: "Personas e invitaciones" })).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent(/Rosa Quispe\s*\(tú\)/);
    expect(within(rows[0]).queryByRole("button", { name: /Acciones/ })).not.toBeInTheDocument();
    expect(rows[1]).toHaveTextContent("Luis Mamani");
    expect(rows[1]).toHaveTextContent("Cajero");
    expect(rows[2]).toHaveTextContent(/ana@correo\.com.*Invitación pendiente · vence en 6 días/);
    expect(screen.getByText(/Cajero:/).closest("p")).toHaveTextContent(/No abre ni cierra la caja/);
  });

  it("makes someone owner after confirming", async () => {
    vi.mocked(updateUserRoleAction).mockResolvedValue({ ok: true, message: "Rol actualizado" });
    const user = userEvent.setup();
    render(<UsersManager users={users} invitations={[]} currentUserId="u-1" />);

    await user.click(screen.getAllByRole("button", { name: "Acciones de Luis Mamani" })[0]);
    await user.click(screen.getByRole("menuitem", { name: "Hacer dueño" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("¿Hacer dueño a Luis Mamani?")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Hacer dueño" }));

    expect(updateUserRoleAction).toHaveBeenCalledWith("u-2", "owner");
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("explains the last owner rule when the API refuses", async () => {
    const { toast } = await import("sonner");
    vi.mocked(updateUserStatusAction).mockResolvedValue({ ok: false, message: "No se puede remover el ultimo owner activo" });
    const user = userEvent.setup();
    render(<UsersManager users={users} invitations={[]} currentUserId="u-2" />);

    await user.click(screen.getAllByRole("button", { name: "Acciones de Rosa Quispe" })[0]);
    await user.click(screen.getByRole("menuitem", { name: "Desactivar" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Desactivar" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Siempre debe quedar al menos un dueño activo."));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("revokes an invitation", async () => {
    vi.mocked(revokeInvitationAction).mockResolvedValue({ ok: true, message: "ok" });
    const user = userEvent.setup();
    render(<UsersManager users={users} invitations={invitations} currentUserId="u-1" />);

    await user.click(screen.getAllByRole("button", { name: "Acciones de la invitación a ana@correo.com" })[0]);
    await user.click(screen.getByRole("menuitem", { name: "Revocar" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Revocar" }));

    expect(revokeInvitationAction).toHaveBeenCalledWith("i-1");
  });

  it("invites with a valid email and the chosen role, and shows the link without email", async () => {
    vi.mocked(inviteCashierAction).mockResolvedValue({ ok: true, message: "", devInviteUrl: "http://localhost/invitacion/abc", fieldErrors: {} });
    const user = userEvent.setup();
    render(<UsersManager users={users} invitations={[]} currentUserId="u-1" />);

    await user.click(screen.getByRole("button", { name: "Invitar persona" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Correo electrónico"), "ana@");
    await user.click(within(dialog).getByRole("button", { name: "Enviar invitación" }));
    expect(within(dialog).getByText("Ese correo no es válido. Ej.: ana@correo.com")).toBeInTheDocument();
    expect(inviteCashierAction).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText("Correo electrónico"), "correo.com");
    await user.click(within(dialog).getByRole("radio", { name: /Dueño/ }));
    await user.click(within(dialog).getByRole("button", { name: "Enviar invitación" }));

    const formData = vi.mocked(inviteCashierAction).mock.calls[0][1];
    expect(formData.get("email")).toBe("ana@correo.com");
    expect(formData.get("role")).toBe("owner");
    expect(await screen.findByText("http://localhost/invitacion/abc")).toBeInTheDocument();
  });
});
