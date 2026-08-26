"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { acceptInvitationAction } from "../actions";
import type { AcceptInvitationState } from "../types";

const initialState: AcceptInvitationState = { ok: false, message: "", fieldErrors: {} };

export function AcceptInvitationForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [state, setState] = useState<AcceptInvitationState>(initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const nextState = await acceptInvitationAction(token, initialState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        toast.success("Cuenta creada. Bienvenido/a.");
        router.replace("/dashboard");
        router.refresh();
      } else if (!Object.keys(nextState.fieldErrors).length) {
        toast.error(nextState.message || "No se pudo aceptar la invitacion");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo conectar con el servidor.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldErrors = state.ok ? {} : state.fieldErrors;
  const formError = !state.ok ? state.message : "";

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electronico</Label>
        <Input id="email" value={email} disabled readOnly />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input
          id="full_name"
          name="full_name"
          maxLength={100}
          autoComplete="name"
          error={Boolean(fieldErrors.full_name)}
        />
        <FieldError message={fieldErrors.full_name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            error={Boolean(fieldErrors.password)}
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
        <p className="text-xs text-text-muted">
          Minimo 8 caracteres, una mayuscula, una minuscula, un numero y un caracter especial.
        </p>
        <FieldError message={fieldErrors.password} />
      </div>
      {formError ? <p className="text-sm text-status-danger">{formError}</p> : null}
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta y acceder"}
      </Button>
    </form>
  );
}
