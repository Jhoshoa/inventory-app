import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = { title: "Crear tienda" };

export default function RegisterPage() {
  return (
    <AuthShell title="Crea tu tienda" description="Prueba gratis, sin tarjeta." footerText="¿Ya tienes cuenta?" footerHref="/login" footerLinkLabel="Entra">
      <RegisterForm />
    </AuthShell>
  );
}
