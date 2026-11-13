"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PASSWORD_RULES } from "../passwordRules";

/** Contraseña con "Mostrar" / "Ocultar" (tablero P13). */
export const PasswordField = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { error?: boolean }>(
  function PasswordField({ className = "", error, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={visible ? "text" : "password"} error={error} className={`pr-20 ${className}`} {...props} />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 h-9 -translate-y-1/2 rounded-control px-3 text-sm font-semibold text-brand-700 hover:bg-app-surface-muted"
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    );
  },
);

/** Requisitos de la contraseña marcados mientras se escribe. */
export function PasswordChecklist({ password, id }: { password: string; id?: string }) {
  const fallbackId = useId();
  return (
    <ul id={id ?? fallbackId} aria-label="Requisitos de la contraseña" className="grid grid-cols-1 gap-x-4 gap-y-1 text-[13px] min-[380px]:grid-cols-2">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.key} className={`flex items-center gap-1.5 ${ok ? "text-status-success" : "text-text-muted"}`}>
            {ok ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            <span>
              {rule.label}
              <span className="sr-only">{ok ? ": cumple" : ": falta"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold uppercase text-text-muted" role="separator">
      <span className="h-px flex-1 bg-app-border" />O<span className="h-px flex-1 bg-app-border" />
    </div>
  );
}

/** Google siempre pide elegir la cuenta (la API manda prompt=select_account). */
export function GoogleButton({ label, onError }: { label: string; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const response = await fetch("/api/auth/oauth/google", { method: "POST" });
          const { url } = (await response.json()) as { url?: string };
          if (url) {
            window.location.href = url;
            return;
          }
          onError("No se pudo conectar con Google. Intenta de nuevo.");
        } catch {
          onError("No se pudo conectar con Google. Intenta de nuevo.");
        }
        setBusy(false);
      }}
    >
      <GoogleMark />
      {busy ? "Abriendo Google…" : label}
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

/** Aviso arriba del formulario (error de la API, sesión vencida, enlace enviado). */
export function AuthNotice({ tone, children }: { tone: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-status-dangerBorder bg-status-dangerBg text-status-danger",
    success: "border-status-successBorder bg-status-successBg text-status-success",
    info: "border-status-infoBorder bg-status-infoBg text-status-info",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-card border px-3.5 py-2.5 text-sm font-medium ${styles[tone]}`}>
      {children}
    </div>
  );
}
