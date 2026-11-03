import { AuthShell } from "@/features/auth/components/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar contraseña"
      description="Te enviaremos un enlace para crear una contraseña nueva."
      footerText="¿Te acordaste?"
      footerHref="/login"
      footerLinkLabel="Volver a iniciar sesión"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
