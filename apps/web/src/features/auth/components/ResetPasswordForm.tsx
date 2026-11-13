"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Label } from "@/components/ui/Label";
import { passwordMeetsRules } from "../passwordRules";
import { authErrorMessage, destinationAfterLogin, emailFromAccessToken } from "../session";
import { AuthNotice, PasswordChecklist, PasswordField } from "./AuthParts";

type LinkState = "checking" | "ready" | "invalid";

interface ResetErrors {
  password?: string;
  confirmation?: string;
  form?: string;
}

const INVALID_LINK_MESSAGE = "Este enlace ya no sirve.";

/**
 * Supabase entrega el access token de recuperación en el *fragmento* de la URL
 * (`#access_token=...&type=recovery`), que el navegador nunca manda al servidor.
 * Se lee una sola vez, se borra de la barra de direcciones y solo viaja al
 * backend junto con la nueva contraseña.
 */
export function readRecoveryToken(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (params.get("error") || params.get("error_code")) return null;
  if (params.get("type") !== "recovery") return null;
  return params.get("access_token") || null;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const parsedRef = useRef(false);
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<ResetErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // En desarrollo React monta los efectos dos veces: la segunda ya no
    // encontraría el fragmento porque se borró en la primera.
    if (parsedRef.current) return;
    parsedRef.current = true;

    tokenRef.current = readRecoveryToken(window.location.hash);
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    setEmail(emailFromAccessToken(tokenRef.current));
    setLinkState(tokenRef.current ? "ready" : "invalid");
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !tokenRef.current) return;

    const nextErrors: ResetErrors = {};
    if (!passwordMeetsRules(password)) nextErrors.password = "La contraseña todavía no cumple los requisitos";
    if (password && password !== confirmation) nextErrors.confirmation = "Las contraseñas no coinciden.";
    if (nextErrors.password || nextErrors.confirmation) {
      setErrors(nextErrors);
      document.getElementById(nextErrors.password ? "password" : "confirmation")?.focus();
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ access_token: tokenRef.current, password }),
      });

      if (response.ok) {
        // "Guardar y entrar": con la contraseña nueva se entra directo; si no se puede, al login con aviso.
        if (email) {
          const login = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
          }).catch(() => null);
          if (login?.ok) {
            const body = (await login.json().catch(() => ({}))) as { user?: { role?: string } };
            router.replace(await destinationAfterLogin(body.user?.role));
            router.refresh();
            return;
          }
        }
        router.replace("/login?reset=success");
        return;
      }

      if (response.status === 401) {
        tokenRef.current = null;
        setLinkState("invalid");
        return;
      }

      const body = await response.json().catch(() => ({}));
      setErrors({ form: authErrorMessage(response.status, body.message, "No se pudo cambiar la contraseña. Intenta de nuevo.") });
    } catch {
      setErrors({ form: "No se pudo conectar con el servidor. Revisa tu conexión." });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (linkState === "checking") {
    return <p className="text-center text-sm text-text-muted">Revisando el enlace…</p>;
  }

  if (linkState === "invalid") {
    return (
      <div className="flex flex-col gap-4">
        <AuthNotice tone="error">{INVALID_LINK_MESSAGE}</AuthNotice>
        <p className="text-sm text-text-body">Puede que ya lo hayas usado o que haya vencido. Pide otro y ábrelo desde el último correo.</p>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Pedir un enlace nuevo</Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {email ? (
        <p className="text-sm text-text-muted">
          Para <strong className="text-text-strong">{email}</strong>
        </p>
      ) : null}
      {errors.form ? <AuthNotice tone="error">{errors.form}</AuthNotice> : null}
      <div className="space-y-1.5">
        <Label htmlFor="password">Nueva contraseña</Label>
        <PasswordField
          id="password"
          name="password"
          autoComplete="new-password"
          maxLength={128}
          value={password}
          error={Boolean(errors.password)}
          aria-describedby="password-rules"
          onChange={(event) => setPassword(event.target.value)}
        />
        <FieldError id="password-error" message={errors.password} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmation">Repite la contraseña</Label>
        <PasswordField
          id="confirmation"
          name="confirmation"
          autoComplete="new-password"
          maxLength={128}
          value={confirmation}
          error={Boolean(errors.confirmation)}
          aria-describedby={errors.confirmation ? "confirmation-error" : undefined}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        <FieldError id="confirmation-error" message={errors.confirmation} />
      </div>
      <PasswordChecklist id="password-rules" password={password} />
      <Button className="!h-12 w-full text-base" type="submit" disabled={isSubmitting || !passwordMeetsRules(password)}>
        {isSubmitting ? "Guardando…" : "Guardar y entrar"}
      </Button>
    </form>
  );
}
