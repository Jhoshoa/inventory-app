import { AuthShell } from "@/features/auth/components/AuthShell";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Nueva contraseña"
      description="Elige una contraseña nueva para tu cuenta."
      footerText="¿Ya la cambiaste?"
      footerHref="/login"
      footerLinkLabel="Iniciar sesión"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
