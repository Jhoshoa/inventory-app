"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
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
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

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
        const message = err.message || "No se pudo crear la cuenta. Intenta de nuevo.";
        setErrors({ form: message });
        toast.error(message);
        return;
      }

      setValues(INITIAL_STATE);
      setIsSuccess(true);
    } catch {
      const message = "No se pudo conectar con el servidor.";
      setErrors({ form: message });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <AuthShell
        title="Tienda creada"
        description="Tu tienda se ha creado exitosamente. Ahora puedes iniciar sesión."
        footerText=""
        footerHref="/login"
        footerLinkLabel="Iniciar sesión"
      >
        <Alert variant="success">
          Tu cuenta ha sido creada. Revisa tu correo electrónico para confirmarla (si es necesario) o inicia sesion ahora.
        </Alert>
        <Button className="w-full" onClick={() => window.location.href = "/login"}>
          Ir a iniciar sesión
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Crear tienda"
      description="Completa tus datos para empezar."
      footerText="¿Ya tienes cuenta?"
      footerHref="/login"
      footerLinkLabel="Inicia sesión"
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <Label htmlFor="full_name">Nombre completo</Label>
          <Input
            id="full_name"
            name="full_name"
            maxLength={100}
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
            maxLength={100}
            value={values.store_name}
            error={Boolean(errors.store_name)}
            onChange={(e) => setValues({ ...values, store_name: e.target.value })}
          />
          <FieldError message={errors.store_name} />
        </div>
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
            onChange={(e) => setValues({ ...values, email: e.target.value })}
          />
          <FieldError message={errors.email} />
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
              value={values.password}
              error={Boolean(errors.password)}
              onChange={(e) => setValues({ ...values, password: e.target.value })}
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
            Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.
          </p>
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
    errors.email = "Correo electrónico es requerido";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Correo electrónico inválido";
  }

  if (!values.password) {
    errors.password = "Contraseña es requerida";
  } else if (values.password.length < 8) {
    errors.password = "La contraseña debe tener al menos 8 caracteres";
  } else if (!/(?=.*[a-z])/.test(values.password)) {
    errors.password = "La contraseña debe tener al menos una minúscula";
  } else if (!/(?=.*[A-Z])/.test(values.password)) {
    errors.password = "La contraseña debe tener al menos una mayúscula";
  } else if (!/(?=.*\d)/.test(values.password)) {
    errors.password = "La contraseña debe tener al menos un número";
  } else if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(values.password)) {
    errors.password = "La contraseña debe tener al menos un carácter especial";
  }

  return errors;
}
