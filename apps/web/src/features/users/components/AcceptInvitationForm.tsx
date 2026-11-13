"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AuthNotice, PasswordChecklist, PasswordField } from "@/features/auth/components/AuthParts";
import { passwordMeetsRules } from "@/features/auth/passwordRules";
import { destinationAfterLogin } from "@/features/auth/session";
import { acceptInvitationAction } from "../actions";
import type { AcceptInvitationState } from "../types";

const initialState: AcceptInvitationState = { ok: false, message: "", fieldErrors: {} };

/** Los motivos de la API (sin tildes) en palabras de la tienda. */
export function invitationErrorMessage(message: string) {
  const text = message.toLowerCase();
  if (text.includes("ya fue utilizada")) return "Esta invitación ya se usó. Si ya creaste tu cuenta, entra con tu correo.";
  if (text.includes("ya pertenece")) return "Ese correo ya tiene una cuenta. Entra con tu correo y tu contraseña.";
  if (text.includes("invitacion") || text.includes("invitación")) return "Esta invitación ya no es válida. Pídele a la tienda que te envíe otra.";
  return message || "No se pudo unir a la tienda. Intenta de nuevo.";
}

/**
 * Aceptar invitación (tablero P13): el correo invitado fijo, tu nombre y una contraseña
 * con sus requisitos. Al unirse entra directo (cajero con caja abierta → Vender).
 */
export function AcceptInvitationForm({ token, email, role }: { token: string; email: string; role: "owner" | "cashier" }) {
  const router = useRouter();
  const [state, setState] = useState<AcceptInvitationState>(initialState);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const nextState = await acceptInvitationAction(token, initialState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        router.replace(await destinationAfterLogin(role));
        router.refresh();
        return;
      }
      const first = (["full_name", "password"] as const).find((key) => nextState.fieldErrors[key]);
      if (first) document.getElementById(first)?.focus();
    } catch {
      setState({ ok: false, message: "No se pudo conectar con el servidor. Revisa tu conexión.", fieldErrors: {} });
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldErrors = state.ok ? {} : state.fieldErrors;
  const formError = !state.ok && state.message && !Object.keys(state.fieldErrors).length ? invitationErrorMessage(state.message) : "";

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input id="email" value={email} disabled readOnly aria-readonly="true" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Tu nombre</Label>
        <Input
          id="full_name"
          name="full_name"
          maxLength={100}
          autoComplete="name"
          error={Boolean(fieldErrors.full_name)}
          aria-describedby={fieldErrors.full_name ? "full_name-error" : undefined}
        />
        <FieldError id="full_name-error" message={fieldErrors.full_name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Crea una contraseña</Label>
        <PasswordField
          id="password"
          name="password"
          autoComplete="new-password"
          maxLength={128}
          value={password}
          error={Boolean(fieldErrors.password)}
          aria-describedby="password-rules"
          onChange={(event) => setPassword(event.target.value)}
        />
        <FieldError id="password-error" message={fieldErrors.password} />
        <PasswordChecklist id="password-rules" password={password} />
      </div>
      <Button className="!h-12 w-full text-base" type="submit" disabled={isSubmitting || !passwordMeetsRules(password)}>
        {isSubmitting ? "Uniéndote…" : "Unirme a la tienda"}
      </Button>
    </form>
  );
}
