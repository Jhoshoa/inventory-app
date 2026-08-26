import { DataFetchError } from "@/components/ui/DataFetchError";
import { InviteCashierForm } from "./InviteCashierForm";
import { InvitationsTable } from "./InvitationsTable";
import { UsersTable } from "./UsersTable";
import type { UserInvitationListResult, UserListResult } from "../types";

export function UsersSection({
  users,
  invitations,
  currentUserId,
}: {
  users: UserListResult;
  invitations: UserInvitationListResult;
  currentUserId: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          Invita cajeros o propietarios adicionales y administra su acceso a esta tienda.
        </p>
        <InviteCashierForm />
      </div>

      {users.ok ? (
        <UsersTable users={users.data.items} currentUserId={currentUserId} />
      ) : (
        <DataFetchError resource="los usuarios" error={users.error.message} />
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-text-strong">Invitaciones</h3>
        {invitations.ok ? (
          <InvitationsTable invitations={invitations.data.items} />
        ) : (
          <DataFetchError resource="las invitaciones" error={invitations.error.message} />
        )}
      </div>
    </div>
  );
}
