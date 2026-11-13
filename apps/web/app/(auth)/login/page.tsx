import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage(props: {
  searchParams: Promise<{ verified?: string; session?: string; reset?: string }>;
}) {
  const searchParams = await props.searchParams;
  return (
    <AuthShell title="Entra a tu tienda" footerText="¿No tienes cuenta?" footerHref="/register" footerLinkLabel="Crea tu tienda gratis">
      <LoginForm
        verified={searchParams.verified === "true"}
        sessionExpired={searchParams.session === "expired"}
        passwordReset={searchParams.reset === "success"}
      />
    </AuthShell>
  );
}
