"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
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

export function LoginForm({ verified }: { verified?: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState<LoginFormState>({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
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
        const body = await response.json().catch(() => ({}));
        setErrors({ form: body.message ?? "Credenciales invalidas o backend no disponible." });
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
        {verified ? <Alert variant="success">Email confirmado. Ahora puedes iniciar sesión.</Alert> : null}
        {errors.form ? <Alert variant="error">{errors.form}</Alert> : null}
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={255}
          value={values.email}
          error={Boolean(errors.email)}
          onChange={(event) => setValues({ ...values, email: event.target.value })}
        />
        <FieldError message={errors.email} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={values.password}
            error={Boolean(errors.password)}
            onChange={(event) => setValues({ ...values, password: event.target.value })}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-strong"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <FieldError message={errors.password} />
      </div>
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-app-surface px-2 text-text-muted">O continúa con</span>
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
    errors.email = "Correo electrónico es requerido";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Correo electrónico inválido";
  }

  if (!values.password) {
    errors.password = "Contraseña es requerida";
  } else if (values.password.length < 6) {
    errors.password = "La contraseña debe tener al menos 6 caracteres";
  }

  return errors;
}
