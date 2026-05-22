import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Session } from "@/lib/auth/session";
import { StoreDayEventTimeline } from "@/features/store-day/components/StoreDayEventTimeline";
import { StoreDayStatusPanel } from "@/features/store-day/components/StoreDayStatusPanel";
import type { StoreDayEventListResult, StoreDayResult } from "@/features/store-day/types";
import { PermissionMatrix } from "./PermissionMatrix";

export function SettingsOverview({
  session,
  storeDay,
  storeDayEvents,
}: {
  session: Session;
  storeDay?: StoreDayResult;
  storeDayEvents?: StoreDayEventListResult;
}) {
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

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Operacion diaria</h2>
          <p className="mt-1 text-sm text-slate-600">
            Apertura y cierre de la jornada de ventas.
          </p>
        </div>
        {storeDay ? <StoreDayManagement storeDay={storeDay} role={session.role} /> : null}
        {storeDayEvents ? <StoreDayEventTimeline events={storeDayEvents} /> : null}
      </section>

      <EmptyState
        title="Gestion de usuarios pendiente"
        description="Invitaciones, cambio de roles y administracion de usuarios quedan para un sprint dedicado."
      />
    </section>
  );
}

function StoreDayManagement({
  storeDay,
  role,
}: {
  storeDay: StoreDayResult;
  role: Session["role"];
}) {
  if (!storeDay.ok) {
    return (
      <Alert variant="error">
        No se pudo cargar el estado de tienda: {storeDay.error.message}
      </Alert>
    );
  }

  return <StoreDayStatusPanel storeDay={storeDay.data} role={role} actions="manage" />;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}
