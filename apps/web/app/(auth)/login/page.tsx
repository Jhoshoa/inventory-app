import { AuthShell } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  return (
    <AuthShell
      title="Iniciar sesion"
      description="Ingresa para administrar tu tienda."
      footerText="No tienes cuenta?"
      footerHref="/register"
      footerLinkLabel="Crea una tienda"
    >
      <LoginForm />
    </AuthShell>
  );
}
