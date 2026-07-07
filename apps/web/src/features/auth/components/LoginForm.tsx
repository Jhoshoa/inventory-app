"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

interface LoginFormState {
  email: string;
  password: string;
}

type LoginFormErrors = Partial<Record<keyof LoginFormState | "form", string>>;

export function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState<LoginFormState>({ email: "", password: "" });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        setErrors({ form: "Credenciales invalidas o backend no disponible." });
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setErrors({ form: "No se pudo conectar con el servidor." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      {errors.form ? <Alert variant="error">{errors.form}</Alert> : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          error={Boolean(errors.email)}
          onChange={(event) => setValues({ ...values, email: event.target.value })}
        />
        <FieldError message={errors.email} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          error={Boolean(errors.password)}
          onChange={(event) => setValues({ ...values, password: event.target.value })}
        />
        <FieldError message={errors.password} />
      </div>
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Ingresando..." : "Iniciar sesion"}
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">O continúa con</span>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={async () => {
          try {
            const res = await fetch("/api/auth/oauth/google", { method: "POST" });
            const { url } = await res.json();
            if (url) window.location.href = url;
          } catch {
            setErrors({ form: "No se pudo conectar con Google" });
          }
        }}
      >
        Continuar con Google
      </Button>
    </form>
  );
}

export function validateLogin(values: LoginFormState): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.email.trim()) {
    errors.email = "Email es requerido";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Email invalido";
  }

  if (!values.password) {
    errors.password = "Password es requerido";
  } else if (values.password.length < 6) {
    errors.password = "Password debe tener al menos 6 caracteres";
  }

  return errors;
}
