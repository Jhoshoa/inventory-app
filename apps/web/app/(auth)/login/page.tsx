import { AuthShell } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default async function LoginPage(props: { searchParams: Promise<{ verified?: string }> }) {
  const searchParams = await props.searchParams;
  return (
    <AuthShell
      title="Iniciar sesion"
      description="Ingresa para administrar tu tienda."
      footerText="No tienes cuenta?"
      footerHref="/register"
      footerLinkLabel="Crea una tienda"
    >
      <LoginForm verified={searchParams.verified === "true"} />
    </AuthShell>
  );
}
