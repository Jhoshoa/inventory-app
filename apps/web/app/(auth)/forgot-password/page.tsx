import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Recupera tu contraseña" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recupera tu contraseña"
      description="Te enviamos un enlace para crear una nueva."
      back={{ href: "/login", label: "Volver a entrar" }}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
