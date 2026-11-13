import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Nueva contraseña" footerText="¿Te acordaste?" footerHref="/login" footerLinkLabel="Entra">
      <ResetPasswordForm />
    </AuthShell>
  );
}
