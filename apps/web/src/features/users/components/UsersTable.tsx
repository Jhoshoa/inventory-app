"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Table,
  TableActionGroup,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { updateUserRoleAction, updateUserStatusAction } from "../actions";
import type { UserResponse } from "../types";

export function UsersTable({
  users,
  currentUserId,
}: {
  users: UserResponse[];
  currentUserId: string;
}) {
  const router = useRouter();

  async function toggleRole(user: UserResponse) {
    const nextRole = user.role === "owner" ? "cashier" : "owner";
    const result = await updateUserRoleAction(user.id, nextRole);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  async function toggleStatus(user: UserResponse) {
    const result = await updateUserStatusAction(user.id, !user.is_active);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  return (
    <Table wrapperClassName="w-full">
      <thead>
        <tr>
          <TableHeaderCell>Usuario</TableHeaderCell>
          <TableHeaderCell>Rol</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell align="right">Acciones</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {users.length === 0 ? (
          <TableEmptyRow colSpan={4}>Aun no hay miembros en esta tienda.</TableEmptyRow>
        ) : (
          users.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <TableRow key={user.id}>
                <TableCell mobileLabel="Usuario">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-strong">
                      {user.full_name || user.email}
                    </p>
                    <p className="truncate text-xs text-text-muted">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell mobileLabel="Rol">
                  <Badge variant={user.role === "owner" ? "success" : "default"}>
                    {user.role === "owner" ? "Propietario" : "Cajero"}
                  </Badge>
                </TableCell>
                <TableCell mobileLabel="Estado">
                  <Badge variant={user.is_active ? "success" : "danger"}>
                    {user.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell align="right">
                  <TableActionGroup>
                    {isSelf ? (
                      <span className="text-xs text-text-muted">Tu cuenta</span>
                    ) : (
                      <>
                        <ConfirmDialog
                          title={user.role === "owner" ? "Quitar rol de propietario" : "Hacer propietario"}
                          description={
                            user.role === "owner"
                              ? `${user.full_name || user.email} pasara a tener el rol de cajero.`
                              : `${user.full_name || user.email} tendra acceso total como propietario.`
                          }
                          triggerLabel={user.role === "owner" ? "Quitar propietario" : "Hacer propietario"}
                          confirmLabel="Confirmar"
                          variant="primary"
                          onConfirm={() => toggleRole(user)}
                        />
                        <ConfirmDialog
                          title={user.is_active ? "Desactivar usuario" : "Activar usuario"}
                          description={
                            user.is_active
                              ? `${user.full_name || user.email} no podra iniciar sesion mientras este inactivo.`
                              : `${user.full_name || user.email} podra volver a iniciar sesion.`
                          }
                          triggerLabel={user.is_active ? "Desactivar" : "Activar"}
                          confirmLabel="Confirmar"
                          variant={user.is_active ? "danger" : "primary"}
                          onConfirm={() => toggleStatus(user)}
                        />
                      </>
                    )}
                  </TableActionGroup>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </tbody>
    </Table>
  );
}
