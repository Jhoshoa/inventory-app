import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Session } from "@/lib/auth/session";
import { PermissionMatrix } from "./PermissionMatrix";

export function SettingsOverview({ session }: { session: Session }) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Ajustes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configuracion de tienda, usuarios y permisos.
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <InfoItem label="Usuario" value={session.email} />
        <InfoItem label="Tienda" value={session.storeName} />
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Rol</p>
          <div className="mt-2">
            <Badge variant={session.role === "owner" ? "success" : "default"}>
              {session.role}
            </Badge>
          </div>
        </div>
      </div>

      <PermissionMatrix />

      <EmptyState
        title="Gestion de usuarios pendiente"
        description="Invitaciones, cambio de roles y administracion de usuarios quedan para un sprint dedicado."
      />
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}
