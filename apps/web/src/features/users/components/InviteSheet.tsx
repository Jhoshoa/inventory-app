"use client";

import { type FormEvent, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { inviteCashierAction } from "../actions";
import { friendlyUserError } from "../list";
import { validateInviteCashierForm } from "../schemas";
import type { UserRoleValue } from "../types";

const ROLES: { value: UserRoleValue; label: string; description: string }[] = [
  { value: "cashier", label: "Cajero", description: "Vende, ve productos y pedidos. No toca caja, precios ni stock." },
  { value: "owner", label: "Dueño", description: "Puede hacer todo, incluida la configuración." },
];

/** "Invitar a alguien" (tablero P10): correo y rol; le llega un enlace que vence en 7 días. */
export function InviteSheet({
  open,
  onOpenChange,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Recibe el enlace cuando no hay correo configurado (desarrollo). */
  onInvited: (devLink: string | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRoleValue>("cashier");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const emailId = useId();

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setRole("cashier");
    setError(undefined);
  }, [open]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return;
    const found = validateInviteCashierForm({ email: email.trim(), role });
    if (found.email) {
      setError(found.email);
      document.getElementById(emailId)?.focus();
      return;
    }
    const data = new FormData();
    data.set("email", email.trim());
    data.set("role", role);
    setSaving(true);
    try {
      const result = await inviteCashierAction({ ok: false, message: "", fieldErrors: {} }, data);
      if (result.ok) {
        toast.success(`Invitación enviada a ${email.trim()}`);
        onOpenChange(false);
        onInvited(result.devInviteUrl);
      } else if (result.fieldErrors.email) {
        setError(result.fieldErrors.email);
      } else {
        toast.error(friendlyUserError(result.message || "No se pudo enviar la invitación"));
      }
    } catch {
      toast.error("No se pudo enviar la invitación. Revisa tu conexión.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (saving ? undefined : onOpenChange(next))} position="sheet" size="md">
      <DialogTitle close={!saving}>Invitar a alguien</DialogTitle>
      <form onSubmit={onSubmit} noValidate className="contents">
        <DialogBody className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label htmlFor={emailId} className="block text-sm font-semibold text-text-body">
              Correo electrónico
            </label>
            <Input
              id={emailId}
              type="email"
              inputMode="email"
              autoComplete="email"
              data-autofocus
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError(undefined);
              }}
              placeholder="ana@correo.com"
              error={Boolean(error)}
              aria-describedby={error ? `${emailId}-error` : undefined}
            />
            {error ? (
              <p id={`${emailId}-error`} className="text-sm text-status-danger">
                {error}
              </p>
            ) : null}
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-semibold text-text-body">Rol</legend>
            {ROLES.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-card border px-3 py-2.5 ${
                  role === option.value ? "border-brand-700 bg-brand-50" : "border-app-borderStrong"
                }`}
              >
                <input
                  type="radio"
                  name="invite-role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                  className="mt-1 accent-brand-700"
                />
                <span>
                  <span className="block text-sm font-bold text-text-strong">{option.label}</span>
                  <span className="block text-[13px] text-text-muted">{option.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="text-[13px] text-text-muted">Le llega un correo con un enlace que vence en 7 días.</p>
        </DialogBody>
        <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Enviando…" : "Enviar invitación"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
