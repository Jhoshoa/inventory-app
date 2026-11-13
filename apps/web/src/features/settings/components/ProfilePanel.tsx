"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { SettingsCard } from "./SettingsField";

/**
 * Mi perfil (tablero P12): nombre y rol, correo (solo lectura), cambiar la contraseña
 * con el enlace de recuperación y cerrar sesión. También lo usa el cajero, desde Más.
 */
export function ProfilePanel({
  name,
  email,
  roleLabel,
  storeName,
  initials,
}: {
  name: string;
  email: string;
  roleLabel: string;
  storeName: string;
  initials: string;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendPasswordLink() {
    if (sending) return;
    setSending(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        toast.error(typeof body.message === "string" ? body.message : "No se pudo enviar el correo. Intenta de nuevo.");
        return;
      }
      setSent(true);
      toast.success(`Te enviamos un enlace a ${email}`);
    } catch {
      toast.error("No se pudo enviar el correo. Revisa tu conexión.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard>
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-extrabold text-brand-700" aria-hidden="true">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-text-strong">{name}</p>
            <p className="truncate text-sm text-text-muted">
              {roleLabel} · {storeName}
            </p>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard>
        <div>
          <p className="text-sm font-semibold text-text-body">Correo</p>
          <p className="break-all text-[15px] font-semibold text-text-strong">{email}</p>
          <p className="text-xs text-text-muted">Es tu usuario para entrar.</p>
        </div>
        <div className="border-t border-app-border" />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-body">Contraseña</p>
            <p role="status" className="text-xs text-text-muted">
              {sent ? "Revisa tu correo y sigue el enlace para elegir una nueva." : "Te enviamos un enlace para cambiarla."}
            </p>
          </div>
          <Button variant="secondary" className="shrink-0" onClick={sendPasswordLink} disabled={sending || sent}>
            {sending ? "Enviando…" : sent ? "Enviado" : "Cambiar"}
          </Button>
        </div>
        <p className="text-xs text-text-muted">Si entras con Google, la contraseña se maneja en tu cuenta de Google.</p>
      </SettingsCard>

      <LogoutButton className="w-full sm:w-auto sm:self-start">
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Cerrar sesión
      </LogoutButton>
    </div>
  );
}
