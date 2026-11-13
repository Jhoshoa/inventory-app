"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Copy, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Menu, MenuItem } from "@/components/ui/Menu";
import {
  resendInvitationAction,
  revokeInvitationAction,
  updateUserRoleAction,
  updateUserStatusAction,
} from "../actions";
import {
  ROLE_LABEL,
  displayName,
  friendlyUserError,
  initials,
  invitationText,
  isInvitationOpen,
  lastLoginText,
} from "../list";
import type { UserInvitationResponse, UserResponse } from "../types";
import { InviteSheet } from "./InviteSheet";

type Pending =
  | { kind: "role"; user: UserResponse; role: "owner" | "cashier" }
  | { kind: "status"; user: UserResponse; active: boolean }
  | { kind: "revoke"; invitation: UserInvitationResponse };

/**
 * Usuarios y permisos (tableros A · Configuración y P10): personas con su rol y último
 * ingreso, invitaciones con su vencimiento, ⋯ por fila (con confirmación) e Invitar.
 * Siempre queda al menos un dueño activo (la API lo exige).
 */
export function UsersManager({
  users,
  invitations,
  currentUserId,
}: {
  users: UserResponse[];
  invitations: UserInvitationResponse[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => setNow(Date.now()), []);
  const clock = now ?? 0;

  const sortedUsers = [...users].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return displayName(a).localeCompare(displayName(b), "es");
  });
  const openInvitations = invitations.filter((invitation) => invitation.status === "pending" || invitation.status === "expired");

  async function run(action: () => Promise<{ ok: boolean; message: string }>, success: string) {
    const result = await action();
    if (!result.ok) {
      toast.error(friendlyUserError(result.message));
      throw new Error(result.message);
    }
    toast.success(success);
    router.refresh();
  }

  async function resend(invitation: UserInvitationResponse) {
    try {
      await run(() => resendInvitationAction(invitation.id), `Invitación reenviada a ${invitation.email}`);
    } catch {
      // El aviso ya se mostró.
    }
  }

  async function copyDevLink() {
    if (!devLink) return;
    try {
      await navigator.clipboard.writeText(devLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  const confirm = pending ? confirmCopy(pending) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end max-sm:order-last">
        <Button onClick={() => setInviteOpen(true)} className="max-sm:w-full">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Invitar persona
        </Button>
      </div>

      {devLink ? (
        <div role="status" className="flex flex-col gap-2 rounded-card border border-status-infoBorder bg-status-infoBg px-4 py-3 text-sm text-status-info">
          <p>
            <strong>Sin correo configurado:</strong> comparte este enlace con la persona invitada.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-app-surface px-2 py-1 text-xs text-text-body">{devLink}</code>
            <Button variant="secondary" className="!h-9 shrink-0 px-3" onClick={copyDevLink}>
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>
      ) : null}

      <section aria-label="Personas e invitaciones" className="overflow-hidden rounded-card border border-app-border bg-app-surface">
        <div className="grid grid-cols-[minmax(0,1fr)_110px_44px] gap-3 border-b border-app-border bg-app-surface-muted px-4 py-2 text-xs font-semibold text-text-muted max-md:hidden lg:grid-cols-[minmax(0,1fr)_120px_140px_44px]">
          <span>Persona</span>
          <span>Rol</span>
          <span className="max-lg:hidden">Último ingreso</span>
          <span className="sr-only">Acciones</span>
        </div>
        <ul className="divide-y divide-app-border">
          {sortedUsers.map((user) => {
            const self = user.id === currentUserId;
            const login = now ? lastLoginText(user.last_login_at, clock) : "";
            return (
              <li key={user.id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_110px_44px] lg:grid-cols-[minmax(0,1fr)_120px_140px_44px] ${user.is_active ? "" : "opacity-70"}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-700" aria-hidden="true">
                    {initials(user)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-text-strong">
                      {displayName(user)} {self ? <span className="font-normal text-text-muted">(tú)</span> : null}
                    </p>
                    <p className="truncate text-[13px] text-text-muted">
                      {user.email}
                      <span className="lg:hidden">{login ? ` · ${self && login === "Ahora" ? "ahora" : `Último ingreso: ${login.toLowerCase()}`}` : ""}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 md:justify-start">
                  <RoleTag role={user.role} active={user.is_active} />
                  <div className="md:hidden">{self ? null : <UserMenu user={user} onPick={setPending} />}</div>
                </div>
                <span className="text-sm text-text-body max-lg:hidden">{login}</span>
                <div className="max-md:hidden">{self ? null : <UserMenu user={user} onPick={setPending} />}</div>
              </li>
            );
          })}
          {openInvitations.map((invitation) => {
            const open = now ? isInvitationOpen(invitation, clock) : invitation.status === "pending";
            return (
              <li key={invitation.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_110px_44px] lg:grid-cols-[minmax(0,1fr)_120px_140px_44px]">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-app-borderStrong text-sm font-bold text-text-muted" aria-hidden="true">
                    @
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-text-strong">{invitation.email}</p>
                    <p className={`truncate text-[13px] ${open ? "text-text-muted" : "text-status-warning"}`}>{now ? invitationText(invitation, clock) : "Invitación pendiente"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5 md:justify-start">
                  <span className="rounded-full bg-app-surface-muted px-2.5 py-0.5 text-xs font-bold text-text-body">{ROLE_LABEL[invitation.role]}</span>
                  <div className="md:hidden">
                    <InvitationMenu invitation={invitation} open={open} onResend={() => void resend(invitation)} onRevoke={() => setPending({ kind: "revoke", invitation })} />
                  </div>
                </div>
                <span className="text-sm text-text-muted max-lg:hidden">—</span>
                <div className="max-md:hidden">
                  <InvitationMenu invitation={invitation} open={open} onResend={() => void resend(invitation)} onRevoke={() => setPending({ kind: "revoke", invitation })} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="roles-title" className="rounded-card border border-app-border bg-app-surface p-4 text-sm">
        <h2 id="roles-title" className="text-[15px] font-bold text-text-strong">
          Qué puede hacer cada rol
        </h2>
        <p className="mt-2 text-text-body">
          <strong className="text-text-strong">Cajero:</strong> vende y cobra (también sin conexión), ve productos, stock, lotes y dónde está cada
          uno, y reportes básicos. No abre ni cierra la caja, no anula ventas ni cambia precios o stock.
        </p>
        <p className="mt-1.5 text-text-body">
          <strong className="text-text-strong">Dueño:</strong> todo, incluida la caja, la configuración y las personas.
        </p>
      </section>

      <InviteSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={(link) => {
          setDevLink(link);
          router.refresh();
        }}
      />

      {pending && confirm ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.label}
          variant={confirm.danger ? "danger" : "primary"}
          onConfirm={async () => {
            if (pending.kind === "role") {
              await run(() => updateUserRoleAction(pending.user.id, pending.role), confirm.done);
            } else if (pending.kind === "status") {
              await run(() => updateUserStatusAction(pending.user.id, pending.active), confirm.done);
            } else {
              await run(() => revokeInvitationAction(pending.invitation.id), confirm.done);
            }
            setPending(null);
          }}
        />
      ) : null}
    </div>
  );
}

function confirmCopy(pending: Pending) {
  if (pending.kind === "role") {
    const name = displayName(pending.user);
    return pending.role === "owner"
      ? { title: `¿Hacer dueño a ${name}?`, description: "Podrá hacer todo, incluida la caja, la configuración y las personas.", label: "Hacer dueño", done: `${name} ahora es dueño`, danger: false }
      : { title: `¿Quitar dueño a ${name}?`, description: "Pasa a cajero: vende y consulta, pero no toca caja, precios, stock ni personas.", label: "Quitar dueño", done: `${name} ahora es cajero`, danger: true };
  }
  if (pending.kind === "status") {
    const name = displayName(pending.user);
    return pending.active
      ? { title: `¿Activar a ${name}?`, description: "Podrá volver a entrar a la tienda.", label: "Activar", done: `${name} puede volver a entrar`, danger: false }
      : { title: `¿Desactivar a ${name}?`, description: "No podrá entrar a la tienda. Sus ventas y cierres se conservan. Puedes activarlo de nuevo.", label: "Desactivar", done: `${name} ya no puede entrar`, danger: true };
  }
  return {
    title: `¿Revocar la invitación a ${pending.invitation.email}?`,
    description: "El enlace deja de funcionar. Puedes invitar de nuevo cuando quieras.",
    label: "Revocar",
    done: "Invitación revocada",
    danger: true,
  };
}

function RoleTag({ role, active }: { role: UserResponse["role"]; active: boolean }) {
  if (!active) return <span className="rounded-full bg-status-dangerBg px-2.5 py-0.5 text-xs font-bold text-status-danger">Desactivado</span>;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${role === "owner" ? "bg-brand-50 text-brand-700" : "bg-app-surface-muted text-text-body"}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}

function UserMenu({ user, onPick }: { user: UserResponse; onPick: (pending: Pending) => void }) {
  return (
    <Menu
      label={`Acciones de ${displayName(user)}`}
      triggerClassName="flex h-10 w-10 items-center justify-center rounded-control text-text-muted hover:bg-app-surface-muted"
      trigger={<MoreHorizontal className="h-5 w-5" aria-hidden="true" />}
    >
      {user.is_active ? (
        <MenuItem onSelect={() => onPick({ kind: "role", user, role: user.role === "owner" ? "cashier" : "owner" })}>
          {user.role === "owner" ? "Quitar dueño" : "Hacer dueño"}
        </MenuItem>
      ) : null}
      <MenuItem tone={user.is_active ? "danger" : "default"} onSelect={() => onPick({ kind: "status", user, active: !user.is_active })}>
        {user.is_active ? "Desactivar" : "Activar"}
      </MenuItem>
    </Menu>
  );
}

function InvitationMenu({
  invitation,
  open,
  onResend,
  onRevoke,
}: {
  invitation: UserInvitationResponse;
  open: boolean;
  onResend: () => void;
  onRevoke: () => void;
}) {
  return (
    <Menu
      label={`Acciones de la invitación a ${invitation.email}`}
      triggerClassName="flex h-10 w-10 items-center justify-center rounded-control text-text-muted hover:bg-app-surface-muted"
      trigger={<MoreHorizontal className="h-5 w-5" aria-hidden="true" />}
    >
      <MenuItem onSelect={onResend}>Reenviar</MenuItem>
      {open ? (
        <MenuItem tone="danger" onSelect={onRevoke}>
          Revocar
        </MenuItem>
      ) : null}
    </Menu>
  );
}
