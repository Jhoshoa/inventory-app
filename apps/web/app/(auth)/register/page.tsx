"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AuthShell } from "@/features/auth/components/AuthShell";

interface RegisterFormState {
  full_name: string;
  email: string;
  store_name: string;
  password: string;
}

type RegisterFormErrors = Partial<Record<keyof RegisterFormState | "form", string>>;

const INITIAL_STATE: RegisterFormState = {
  full_name: "",
  email: "",
  store_name: "",
  password: "",
};

export default function RegisterPage() {
  const [values, setValues] = useState<RegisterFormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateRegister(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setErrors({ form: err.message || "No se pudo crear la cuenta. Intenta de nuevo." });
        return;
      }

      setValues(INITIAL_STATE);
      setIsSuccess(true);
    } catch {
      setErrors({ form: "No se pudo conectar con el servidor." });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <AuthShell
        title="Tienda creada"
        description="Tu tienda se ha creado exitosamente. Ahora puedes iniciar sesion."
        footerText=""
        footerHref="/login"
        footerLinkLabel="Iniciar sesion"
      >
        <Alert variant="success">
          Tu cuenta ha sido creada. Revisa tu email para confirmarla (si es necesario) o inicia sesion ahora.
        </Alert>
        <Button className="w-full" onClick={() => window.location.href = "/login"}>
          Ir a iniciar sesion
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Crear tienda"
      description="Completa tus datos para empezar."
      footerText="Ya tienes cuenta?"
      footerHref="/login"
      footerLinkLabel="Inicia sesion"
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        {errors.form ? <Alert variant="error">{errors.form}</Alert> : null}
        <div className="space-y-2">
          <Label htmlFor="full_name">Nombre completo</Label>
          <Input
            id="full_name"
            name="full_name"
            value={values.full_name}
            error={Boolean(errors.full_name)}
            onChange={(e) => setValues({ ...values, full_name: e.target.value })}
          />
          <FieldError message={errors.full_name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="store_name">Nombre de tienda</Label>
          <Input
            id="store_name"
            name="store_name"
            value={values.store_name}
            error={Boolean(errors.store_name)}
            onChange={(e) => setValues({ ...values, store_name: e.target.value })}
          />
          <FieldError message={errors.store_name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            error={Boolean(errors.email)}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
          />
          <FieldError message={errors.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            error={Boolean(errors.password)}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
          />
          <FieldError message={errors.password} />
        </div>
        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creando cuenta..." : "Crear tienda"}
        </Button>
      </form>
    </AuthShell>
  );
}

function validateRegister(values: RegisterFormState): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!values.full_name.trim()) {
    errors.full_name = "Nombre completo es requerido";
  }

  if (!values.store_name.trim()) {
    errors.store_name = "Nombre de tienda es requerido";
  }

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
