import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AuthNotice } from "@/features/auth/components/AuthParts";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { AcceptInvitationForm } from "@/features/users/components/AcceptInvitationForm";
import { getInvitationPreview } from "@/features/users/api";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Invitación",
  robots: { index: false, follow: false },
};

const ROLE_LABEL = { owner: "Dueño", cashier: "Cajero" } as const;

const STATUS_MESSAGES: Record<string, string> = {
  accepted: "Esta invitación ya se usó. Si ya creaste tu cuenta, entra con tu correo.",
  revoked: "Esta invitación ya no es válida. Pídele a la tienda que te envíe otra.",
  expired: "Esta invitación venció. Pídele a la tienda que te envíe otra.",
};

const INVALID_MESSAGE = "Esta invitación ya no es válida. Pídele a la tienda que te envíe otra.";

/** Aceptar invitación (tablero P13): quién invita, a qué tienda y con qué rol. */
export default async function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const preview = await getInvitationPreview(token);

  // Recién aceptada por quien está en esta pantalla: guardar la sesión vuelve a dibujar la
  // página antes de que el formulario lleve a la tienda, así que no se muestra "no disponible".
  if (preview.ok && preview.data.status === "accepted") {
    const session = await getSession();
    if (session && session.email.toLowerCase() === preview.data.email.toLowerCase()) {
      return (
        <AuthShell title={`Ya eres parte de ${preview.data.store_name}`}>
          <div className="flex flex-col gap-4">
            <AuthNotice tone="success">Entrando a tu tienda…</AuthNotice>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/dashboard">Ir a la tienda</Link>
            </Button>
          </div>
        </AuthShell>
      );
    }
  }

  if (!preview.ok || preview.data.status !== "pending") {
    const message = preview.ok ? (STATUS_MESSAGES[preview.data.status] ?? INVALID_MESSAGE) : INVALID_MESSAGE;
    return (
      <AuthShell title="Invitación no disponible">
        <div className="flex flex-col gap-4">
          <AuthNotice tone="error">{message}</AuthNotice>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/login">Ir a entrar</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  const { store_name, role, invited_by_name, email } = preview.data;
  const roleLabel = ROLE_LABEL[role] ?? ROLE_LABEL.cashier;
  const description = invited_by_name
    ? `${invited_by_name} te invitó a ${store_name} como ${roleLabel}.`
    : `Te invitaron a ${store_name} como ${roleLabel}.`;

  return (
    <AuthShell title={`Únete a ${store_name}`} description={description} footerText="¿Ya tienes cuenta?" footerHref="/login" footerLinkLabel="Entra">
      <AcceptInvitationForm token={token} email={email} role={role} />
    </AuthShell>
  );
}
