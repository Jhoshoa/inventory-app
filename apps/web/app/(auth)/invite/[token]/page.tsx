import type { Metadata } from "next";
import { Alert } from "@/components/ui/Alert";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { AcceptInvitationForm } from "@/features/users/components/AcceptInvitationForm";
import { getInvitationPreview } from "@/features/users/api";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const STATUS_MESSAGES: Record<string, string> = {
  accepted: "Esta invitacion ya fue utilizada. Si ya tienes cuenta, inicia sesion.",
  revoked: "Esta invitacion fue revocada por el propietario de la tienda.",
  expired: "Esta invitacion ha expirado. Pide al propietario que te envie una nueva.",
};

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getInvitationPreview(token);

  if (!preview.ok) {
    return (
      <AuthShell
        title="Invitacion no valida"
        description="No pudimos verificar esta invitacion."
        footerText="¿Ya tienes cuenta?"
        footerHref="/login"
        footerLinkLabel="Inicia sesion"
      >
        <Alert variant="error">{preview.error.message || "Invitacion no valida o expirada."}</Alert>
      </AuthShell>
    );
  }

  if (preview.data.status !== "pending") {
    return (
      <AuthShell
        title="Invitacion no disponible"
        description={`Invitacion a ${preview.data.store_name}`}
        footerText="¿Ya tienes cuenta?"
        footerHref="/login"
        footerLinkLabel="Inicia sesion"
      >
        <Alert variant="warning">
          {STATUS_MESSAGES[preview.data.status] ?? "Esta invitacion ya no esta disponible."}
        </Alert>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Unete a tu equipo"
      description={`Fuiste invitado a ${preview.data.store_name} como ${preview.data.role === "owner" ? "propietario" : "cajero"}.`}
      footerText="¿Ya tienes cuenta?"
      footerHref="/login"
      footerLinkLabel="Inicia sesion"
    >
      <AcceptInvitationForm token={token} email={preview.data.email} />
    </AuthShell>
  );
}
