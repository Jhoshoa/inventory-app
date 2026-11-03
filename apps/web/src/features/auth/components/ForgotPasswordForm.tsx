"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [sentMessage, setSentMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);

    if (!email.trim()) {
      setFieldError("Correo electrónico es requerido");
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setFieldError("Correo electrónico inválido");
      return;
    }
    setFieldError(undefined);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setFormError(body.message ?? "No se pudo enviar el correo. Intenta de nuevo.");
        return;
      }
      setSentMessage(body.message);
    } catch {
      setFormError("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sentMessage) {
    return (
      <div className="space-y-4">
        <Alert variant="success">{sentMessage}</Alert>
        <p className="text-sm text-text-muted">
          Revisa tu bandeja de entrada y la carpeta de spam. El enlace es válido por tiempo limitado.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={255}
          value={email}
          error={Boolean(fieldError)}
          onChange={(event) => setEmail(event.target.value)}
        />
        <FieldError message={fieldError} />
      </div>
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando..." : "Enviar enlace"}
      </Button>
    </form>
  );
}
