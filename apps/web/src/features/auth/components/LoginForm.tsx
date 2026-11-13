"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { EMAIL_PATTERN, authErrorMessage, destinationAfterLogin } from "../session";
import { AuthDivider, AuthNotice, GoogleButton, PasswordField } from "./AuthParts";

interface LoginFormState {
  email: string;
  password: string;
}

type LoginFormErrors = Partial<Record<keyof LoginFormState | "form", string>>;

/**
 * Entrar (tablero P13): correo y contraseña o Google. Después: dueño → Inicio; cajero →
 * Vender si la caja está abierta, si no Inicio.
 */
export function LoginForm({
  verified,
  sessionExpired,
  passwordReset,
}: {
  verified?: boolean;
  sessionExpired?: boolean;
  passwordReset?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<LoginFormState>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notice = passwordReset
    ? "Contraseña actualizada. Entra con la nueva."
    : verified
      ? "Correo confirmado. Ya puedes entrar."
      : sessionExpired
        ? "Tu sesión terminó. Vuelve a entrar."
        : null;

  useEffect(() => {
    if (errors.form) document.getElementById("email")?.focus();
  }, [errors.form]);

  // El enlace de "Confirma tu correo" vuelve aquí con la sesión de Auth en el fragmento
  // (#access_token=...). No se usa: se entra con correo y contraseña. Se borra para que
  // el token no quede en la barra de direcciones ni en el historial.
  useEffect(() => {
    if (window.location.hash.includes("access_token")) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(nextErrors.email ? "email" : "password")?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: values.email.trim(), password: values.password }),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string; user?: { role?: string } };

      if (!response.ok) {
        setErrors({ form: authErrorMessage(response.status, body.message, "No se pudo entrar. Intenta de nuevo.") });
        return;
      }

      router.replace(await destinationAfterLogin(body.user?.role));
      router.refresh();
    } catch {
      setErrors({ form: "No se pudo conectar con el servidor. Revisa tu conexión." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {errors.form ? <AuthNotice tone="error">{errors.form}</AuthNotice> : notice ? <AuthNotice tone={sessionExpired ? "info" : "success"}>{notice}</AuthNotice> : null}
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={255}
          value={values.email}
          error={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          onChange={(event) => setValues({ ...values, email: event.target.value })}
        />
        <FieldError id="email-error" message={errors.email} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <PasswordField
          id="password"
          name="password"
          autoComplete="current-password"
          value={values.password}
          error={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          onChange={(event) => setValues({ ...values, password: event.target.value })}
        />
        <FieldError id="password-error" message={errors.password} />
        <div className="text-right">
          <Link href="/forgot-password" className="tap-area text-sm font-semibold text-brand-700 underline-offset-4 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
      <Button className="!h-12 w-full text-base" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Entrando…" : "Entrar"}
      </Button>
      <AuthDivider />
      <GoogleButton label="Continuar con Google" onError={(message) => toast.error(message)} />
    </form>
  );
}

export function validateLogin(values: LoginFormState): LoginFormErrors {
  const errors: LoginFormErrors = {};
  if (!values.email.trim()) errors.email = "Escribe tu correo";
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Ese correo no es válido. Ej.: rosa@correo.com";
  if (!values.password) errors.password = "Escribe tu contraseña";
  return errors;
}
