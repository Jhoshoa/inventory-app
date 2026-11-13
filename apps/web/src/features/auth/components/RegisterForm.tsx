"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { passwordMeetsRules } from "../passwordRules";
import { EMAIL_PATTERN, authErrorMessage } from "../session";
import { AuthDivider, AuthNotice, GoogleButton, PasswordChecklist, PasswordField } from "./AuthParts";

interface RegisterValues {
  store_name: string;
  full_name: string;
  email: string;
  password: string;
}

type RegisterErrors = Partial<Record<keyof RegisterValues | "form", string>>;

const INITIAL: RegisterValues = { store_name: "", full_name: "", email: "", password: "" };

/**
 * Crear tienda (tablero P13): tienda, tu nombre, correo y contraseña con sus requisitos
 * marcados mientras se escribe. Si la API pide confirmar el correo se avisa; si no,
 * entra directo con la prueba gratis.
 */
export function RegisterForm() {
  const router = useRouter();
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const passwordReady = passwordMeetsRules(values.password);

  function set<K extends keyof RegisterValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const found = validateRegister(values);
    setErrors(found);
    const first = (["store_name", "full_name", "email", "password"] as const).find((key) => found[key]);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, email: values.email.trim(), store_name: values.store_name.trim(), full_name: values.full_name.trim() }),
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string; user?: unknown };
      if (!response.ok) {
        setErrors({ form: authErrorMessage(response.status, body.message, "No se pudo crear la tienda. Intenta de nuevo.") });
        return;
      }
      if (body.user) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      setConfirmEmail(values.email.trim());
    } catch {
      setErrors({ form: "No se pudo conectar con el servidor. Revisa tu conexión." });
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmEmail) {
    return (
      <div className="flex flex-col gap-4">
        <AuthNotice tone="success">Tu tienda está creada. Revisa tu correo para confirmar la cuenta.</AuthNotice>
        <p className="text-sm text-text-body">
          Te enviamos un enlace a <strong className="text-text-strong">{confirmEmail}</strong>. Ábrelo y después entra con tu correo y tu
          contraseña. Revisa también &ldquo;Spam&rdquo;.
        </p>
        <Button className="w-full" onClick={() => router.push("/login")}>
          Ir a entrar
        </Button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
      {errors.form ? <AuthNotice tone="error">{errors.form}</AuthNotice> : null}
      <Field id="store_name" label="Nombre de la tienda" error={errors.store_name}>
        <Input id="store_name" name="store_name" maxLength={100} autoComplete="organization" value={values.store_name} error={Boolean(errors.store_name)} onChange={(event) => set("store_name", event.target.value)} />
      </Field>
      <Field id="full_name" label="Tu nombre" error={errors.full_name}>
        <Input id="full_name" name="full_name" maxLength={100} autoComplete="name" value={values.full_name} error={Boolean(errors.full_name)} onChange={(event) => set("full_name", event.target.value)} />
      </Field>
      <Field id="email" label="Correo electrónico" error={errors.email}>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={255} value={values.email} error={Boolean(errors.email)} onChange={(event) => set("email", event.target.value)} />
      </Field>
      <Field id="password" label="Contraseña" error={errors.password}>
        <PasswordField
          id="password"
          name="password"
          autoComplete="new-password"
          value={values.password}
          error={Boolean(errors.password)}
          aria-describedby="password-rules"
          onChange={(event) => set("password", event.target.value)}
        />
        <PasswordChecklist id="password-rules" password={values.password} />
      </Field>
      <Button className="!h-12 w-full text-base" type="submit" disabled={submitting || !passwordReady}>
        {submitting ? "Creando tu tienda…" : "Crear mi tienda"}
      </Button>
      <AuthDivider />
      <GoogleButton label="Crear con Google" onError={(message) => toast.error(message)} />
    </form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function validateRegister(values: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};
  if (!values.store_name.trim()) errors.store_name = "Escribe el nombre de tu tienda";
  if (!values.full_name.trim()) errors.full_name = "Escribe tu nombre";
  if (!values.email.trim()) errors.email = "Escribe tu correo";
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Ese correo no es válido. Ej.: rosa@correo.com";
  if (!passwordMeetsRules(values.password)) errors.password = "La contraseña todavía no cumple los requisitos";
  return errors;
}
