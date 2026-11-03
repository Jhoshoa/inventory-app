"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PASSWORD_HINT, passwordStrengthError } from "../passwordRules";

type LinkState = "checking" | "ready" | "invalid";

interface ResetErrors {
  password?: string;
  confirmation?: string;
  form?: string;
}

const INVALID_LINK_MESSAGE = "El enlace expiró o no es válido. Solicita uno nuevo.";

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
  const passwordRef = useRef<HTMLInputElement>(null);
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    setLinkState(tokenRef.current ? "ready" : "invalid");
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !tokenRef.current) return;

    const nextErrors: ResetErrors = {};
    if (!password) nextErrors.password = "Contraseña es requerida";
    else nextErrors.password = passwordStrengthError(password);
    if (password && password !== confirmation) {
      nextErrors.confirmation = "Las contraseñas no coinciden";
    }
    if (nextErrors.password || nextErrors.confirmation) {
      setErrors(nextErrors);
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
        router.replace("/login?reset=success");
        return;
      }

      if (response.status === 401) {
        tokenRef.current = null;
        setLinkState("invalid");
        return;
      }

      const body = await response.json().catch(() => ({}));
      setErrors({ form: body.message ?? "No se pudo actualizar la contraseña. Intenta de nuevo." });
    } catch {
      setErrors({ form: "No se pudo conectar con el servidor." });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (linkState === "checking") {
    return <p className="text-center text-sm text-text-muted">Verificando enlace...</p>;
  }

  if (linkState === "invalid") {
    return (
      <div className="space-y-4">
        <Alert variant="error">{INVALID_LINK_MESSAGE}</Alert>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Solicitar un enlace nuevo</Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      {errors.form ? <Alert variant="error">{errors.form}</Alert> : null}
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <div className="relative">
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            maxLength={128}
            value={password}
            error={Boolean(errors.password)}
            onChange={(event) => setPassword(event.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => {
              setShowPassword(!showPassword);
              passwordRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-strong"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <p className="text-xs text-text-muted">{PASSWORD_HINT}</p>
        <FieldError message={errors.password} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmation">Confirmar contraseña</Label>
        <Input
          id="confirmation"
          name="confirmation"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          maxLength={128}
          value={confirmation}
          error={Boolean(errors.confirmation)}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        <FieldError message={errors.confirmation} />
      </div>
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : "Guardar contraseña"}
      </Button>
    </form>
  );
}
