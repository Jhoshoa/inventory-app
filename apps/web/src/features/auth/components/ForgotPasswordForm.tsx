"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { EMAIL_PATTERN, authErrorMessage } from "../session";
import { AuthNotice } from "./AuthParts";

/** Espera antes de "Enviar otro": el servicio de correo limita cuántos se piden seguidos. */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Recupera tu contraseña (tablero P13). El aviso es el mismo exista o no la cuenta, para
 * no revelar qué correos están registrados.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function send(address: string) {
    setFormError(undefined);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setFormError(authErrorMessage(response.status, body.message, "No se pudo enviar el enlace. Intenta de nuevo."));
        return;
      }
      setSentTo(address);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setFormError("No se pudo conectar con el servidor. Revisa tu conexión.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const address = email.trim();
    if (!address) {
      setFieldError("Escribe tu correo");
      document.getElementById("email")?.focus();
      return;
    }
    if (!EMAIL_PATTERN.test(address)) {
      setFieldError("Ese correo no es válido. Ej.: rosa@correo.com");
      document.getElementById("email")?.focus();
      return;
    }
    setFieldError(undefined);
    await send(address);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <AuthNotice tone="success">Si ese correo tiene una cuenta, te llegó un enlace. Revisa también &ldquo;Spam&rdquo;.</AuthNotice>
        <p className="text-sm text-text-body">
          Lo enviamos a <strong className="text-text-strong">{sentTo}</strong>. Abre el enlace del último correo que te llegue.
        </p>
        {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
        <Button variant="secondary" className="w-full" disabled={isSubmitting || cooldown > 0} onClick={() => void send(sentTo)}>
          {isSubmitting ? "Enviando…" : cooldown > 0 ? `Enviar otro en ${cooldown} s` : "Enviar otro enlace"}
        </Button>
        <button
          type="button"
          className="self-center text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
          onClick={() => {
            setSentTo(null);
            setFormError(undefined);
          }}
        >
          Usar otro correo
        </button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={255}
          value={email}
          error={Boolean(fieldError)}
          aria-describedby={fieldError ? "email-error" : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldError) setFieldError(undefined);
          }}
        />
        <FieldError id="email-error" message={fieldError} />
      </div>
      <Button className="!h-12 w-full text-base" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  );
}
