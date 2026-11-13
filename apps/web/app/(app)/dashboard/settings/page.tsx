import type { Metadata } from "next";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { planLine } from "@/components/layout/plan";
import { getStore } from "@/features/settings/api";
import { SettingsIndex } from "@/features/settings/components/SettingsIndex";
import { discountSummary, teamSummary } from "@/features/settings/sections";
import { listUserInvitations, listUsers } from "@/features/users/api";
import { canViewSettings } from "@/lib/auth/permissions";
import { requireSession, type Session } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Configuración" };

// Índice de Configuración (tablero P10, solo el dueño).
export default async function SettingsPage() {
  const session = await requireSession();
  if (!canViewSettings(session.role)) {
    return <ForbiddenState description="Solo el dueño de la tienda puede entrar a Configuración." />;
  }
  const [store, users, invitations] = await Promise.all([
    getStore().catch(() => null),
    listUsers(100, 0),
    listUserInvitations(100, 0),
  ]);
  const people = users.ok ? users.data.items.filter((user) => user.is_active).length : null;
  const pending = invitations.ok ? invitations.data.items.filter((invitation) => invitation.status === "pending").length : 0;

  return (
    <SettingsIndex
      storeName={store?.name ?? session.storeName}
      plan={indexPlanLine(session)}
      rows={{
        precios: store ? { summary: discountSummary(store) } : undefined,
        catalogo: store
          ? { tag: store.storefront_enabled ? { label: "Activo", tone: "success" } : { label: "Apagado", tone: "muted" } }
          : undefined,
        usuarios: people !== null ? { summary: teamSummary(people, pending) } : undefined,
      }}
    />
  );
}

/** "Plan Prueba · quedan 9 días" (tablero P10); otros estados como en la barra lateral. */
function indexPlanLine(session: Session) {
  const days = session.daysUntilTrialEnds;
  if (session.subscriptionStatus === "trial" && days !== null && days > 0) {
    return `Plan Prueba · ${days === 1 ? "queda 1 día" : `quedan ${days} días`}`;
  }
  return planLine(session);
}
