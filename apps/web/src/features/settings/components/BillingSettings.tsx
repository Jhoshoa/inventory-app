import { Badge } from "@/components/ui/Badge";
import type { BillingStatus } from "@/features/settings/api/billing";
import type { Session } from "@/lib/auth/session";
import { SUBSCRIPTION_LABELS, SUBSCRIPTION_VARIANTS } from "@/lib/constants/subscription";
import { formatDateLong } from "@/lib/format/datetime";

const ACCESS_LABELS: Record<string, string> = {
  active: "Activo",
  suspended: "Suspendido",
  archived: "Archivado",
  purged: "Eliminado",
};

const ACCESS_VARIANTS: Record<string, "success" | "danger" | "default"> = {
  active: "success",
  suspended: "danger",
  archived: "default",
  purged: "default",
};

export function BillingSettings({
  billing,
  session,
}: {
  billing: BillingStatus;
  session: Session;
}) {
  const isOwner = session.role === "owner";

  return (
    <section className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
      <div className="mb-4">
        <p className="text-xs font-medium uppercase text-text-muted">Administracion</p>
        <h2 className="mt-1 text-lg font-semibold text-text-strong">Suscripcion</h2>
        <p className="mt-1 text-sm text-text-muted">
          Estado de tu plan y facturacion.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoItem
          label="Estado de suscripcion"
          value={SUBSCRIPTION_LABELS[billing.subscription_status] ?? billing.subscription_status}
          badge={<Badge variant={SUBSCRIPTION_VARIANTS[billing.subscription_status] ?? "default"}>{billing.subscription_status}</Badge>}
        />
        <InfoItem
          label="Estado de acceso"
          value={ACCESS_LABELS[billing.access_status] ?? billing.access_status}
          badge={<Badge variant={ACCESS_VARIANTS[billing.access_status] ?? "default"}>{billing.access_status}</Badge>}
        />
        {billing.subscription_status === "trial" && billing.trial_expires_at ? (
          <>
            <InfoItem label="Fin del periodo de prueba" value={formatDateLong(billing.trial_expires_at)} />
            <InfoItem
              label="Dias restantes de prueba"
              value={billing.days_until_trial_ends !== null ? String(billing.days_until_trial_ends) : "—"}
            />
          </>
        ) : null}
        {billing.subscription_status === "active" && billing.next_billing_date ? (
          <>
            <InfoItem label="Proxima facturacion" value={formatDateLong(billing.next_billing_date)} />
            <InfoItem
              label="Dias hasta facturacion"
              value={billing.days_until_next_billing !== null ? String(billing.days_until_next_billing) : "—"}
            />
          </>
        ) : null}
        {billing.subscription_status === "past_due" ? (
          <InfoItem
            label="Dias de gracia restantes"
            value={billing.grace_days_remaining !== null ? String(billing.grace_days_remaining) : "—"}
            badge={<Badge variant="warning">Accion requerida</Badge>}
          />
        ) : null}
        {billing.subscription_status === "expired" ? (
          <InfoItem
            label="Estado"
            value="Acceso suspendido"
            badge={<Badge variant="danger">Renovar plan</Badge>}
          />
        ) : null}
      </div>

      {!isOwner ? (
        <p className="mt-4 text-sm text-text-muted">
          Solo el owner puede administrar la suscripcion.
        </p>
      ) : null}
    </section>
  );
}

function InfoItem({
  badge,
  label,
  value,
}: {
  badge?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-text-muted">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-sm font-medium text-text-strong">{value}</p>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
    </div>
  );
}

