import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { getStore } from "@/features/settings/api";
import { SettingsOverview } from "@/features/settings/components/SettingsOverview";
import { listUserInvitations, listUsers } from "@/features/users/api";
import { canViewSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await requireSession();
  if (!canViewSettings(session.role)) {
    return <ForbiddenState description="Solo el dueño de la tienda puede entrar a Configuración." />;
  }
  const [storeData, users, userInvitations] = await Promise.all([
    getStore().catch(() => null),
    listUsers(),
    listUserInvitations(),
  ]);
  return (
    <SettingsOverview
      session={session}
      storeData={storeData ?? undefined}
      users={users}
      userInvitations={userInvitations}
    />
  );
}
