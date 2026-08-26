"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableActionGroup,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatDateTimeShort } from "@/lib/format/datetime";
import { resendInvitationAction, revokeInvitationAction } from "../actions";
import type { InvitationStatus, UserInvitationResponse } from "../types";

const STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  revoked: "Revocada",
  expired: "Expirada",
};

const STATUS_VARIANTS: Record<InvitationStatus, "default" | "success" | "danger" | "warning"> = {
  pending: "warning",
  accepted: "success",
  revoked: "danger",
  expired: "default",
};

export function InvitationsTable({ invitations }: { invitations: UserInvitationResponse[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function revoke(invitation: UserInvitationResponse) {
    const result = await revokeInvitationAction(invitation.id);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  function resend(invitation: UserInvitationResponse) {
    setPendingId(invitation.id);
    startTransition(async () => {
      const result = await resendInvitationAction(invitation.id);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
      setPendingId(null);
    });
  }

  return (
    <Table wrapperClassName="w-full">
      <thead>
        <tr>
          <TableHeaderCell>Email</TableHeaderCell>
          <TableHeaderCell>Rol</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell>Expira</TableHeaderCell>
          <TableHeaderCell align="right">Acciones</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {invitations.length === 0 ? (
          <TableEmptyRow colSpan={5}>No hay invitaciones registradas.</TableEmptyRow>
        ) : (
          invitations.map((invitation) => {
            const rowPending = isPending && pendingId === invitation.id;
            const isPendingStatus = invitation.status === "pending";
            return (
              <TableRow key={invitation.id}>
                <TableCell mobileLabel="Email">
                  <p className="truncate text-text-strong">{invitation.email}</p>
                </TableCell>
                <TableCell mobileLabel="Rol">
                  <Badge variant={invitation.role === "owner" ? "success" : "default"}>
                    {invitation.role === "owner" ? "Propietario" : "Cajero"}
                  </Badge>
                </TableCell>
                <TableCell mobileLabel="Estado">
                  <Badge variant={STATUS_VARIANTS[invitation.status]}>
                    {STATUS_LABELS[invitation.status]}
                  </Badge>
                </TableCell>
                <TableCell mobileLabel="Expira">
                  <span className="text-xs text-text-muted">
                    {formatDateTimeShort(invitation.expires_at)}
                  </span>
                </TableCell>
                <TableCell align="right">
                  {isPendingStatus ? (
                    <TableActionGroup>
                      <Button variant="ghost" disabled={rowPending} onClick={() => resend(invitation)}>
                        Reenviar
                      </Button>
                      <ConfirmDialog
                        title="Revocar invitacion"
                        description={`La invitacion enviada a ${invitation.email} dejara de ser valida.`}
                        triggerLabel="Revocar"
                        confirmLabel="Revocar"
                        variant="danger"
                        onConfirm={() => revoke(invitation)}
                      />
                    </TableActionGroup>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </tbody>
    </Table>
  );
}
