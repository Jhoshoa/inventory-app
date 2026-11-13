import type { Metadata } from "next";
import { ProfilePanel } from "@/features/settings/components/ProfilePanel";
import { SettingsHeader } from "@/features/settings/components/SettingsHeader";
import { ROLE_LABEL, initials } from "@/features/users/list";
import { canViewSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Mi perfil" };

// Mi perfil (tablero P12): el dueño llega desde Configuración, el cajero desde Más.
export default async function ProfilePage() {
  const session = await requireSession();
  const owner = canViewSettings(session.role);
  const user = { full_name: session.fullName, email: session.email };
  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader section="perfil" backHref={owner ? "/dashboard/settings" : "/dashboard/mas"} backLabel={owner ? "Configuración" : "Más"} />
      <ProfilePanel
        name={session.fullName?.trim() || session.email.split("@")[0]}
        email={session.email}
        roleLabel={session.role === "owner" ? ROLE_LABEL.owner : ROLE_LABEL.cashier}
        storeName={session.storeName}
        initials={initials(user)}
      />
    </div>
  );
}
