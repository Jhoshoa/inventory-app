import type { ReactNode } from "react";
import { getStore } from "@/features/settings/api";
import { SettingsFrame } from "@/features/settings/components/SettingsFrame";
import { canViewSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

// Configuración (Fase 7): en escritorio y tablet, menú a la izquierda y la sección a la
// derecha. El cajero solo tiene Mi perfil: sin menú.
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  if (!canViewSettings(session.role)) return <>{children}</>;

  const store = await getStore().catch(() => null);
  const days = session.subscriptionStatus === "trial" ? session.daysUntilTrialEnds : null;
  const badges = {
    catalogo: store?.storefront_enabled ? "Activo" : undefined,
    plan: days !== null && days > 0 ? `${days} ${days === 1 ? "día" : "días"}` : undefined,
  };

  return <SettingsFrame badges={badges}>{children}</SettingsFrame>;
}
