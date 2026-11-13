import type { Metadata } from "next";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { SettingsHeader } from "@/features/settings/components/SettingsHeader";
import { listUserInvitations, listUsers } from "@/features/users/api";
import { UsersManager } from "@/features/users/components/UsersManager";
import { canManageSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Usuarios y permisos" };

export default async function UsersPage() {
  const session = await requireSession();
  if (!canManageSettings(session.role)) {
    return <ForbiddenState description="Solo el dueño de la tienda puede administrar a las personas." />;
  }
  const [users, invitations] = await Promise.all([listUsers(100, 0), listUserInvitations(100, 0)]);
  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader section="usuarios" description="Quién entra a la tienda y qué puede hacer cada uno." />
      {!users.ok ? (
        <DataFetchError resource="las personas" error={users.error.message} />
      ) : (
        <UsersManager
          users={users.data.items}
          invitations={invitations.ok ? invitations.data.items : []}
          currentUserId={session.userId}
        />
      )}
    </div>
  );
}
