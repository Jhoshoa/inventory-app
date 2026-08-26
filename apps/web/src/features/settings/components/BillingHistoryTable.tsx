import type { BillingHistoryEntry } from "@/features/settings/api/billing";
import { Table, TableCell, TableEmptyRow, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { formatDateTimeShort } from "@/lib/format/datetime";

const REASON_LABELS: Record<string, string> = {
  payment_requested: "Solicitud de pago enviada",
  trial_expired: "Prueba gratuita vencida (automatico)",
  grace_period_expired: "Periodo de gracia vencido (automatico)",
};

function reasonLabel(reason: string) {
  return REASON_LABELS[reason] ?? reason;
}

export function BillingHistoryTable({ entries }: { entries: BillingHistoryEntry[] }) {
  return (
    <section className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
      <div className="mb-4">
        <p className="text-xs font-medium uppercase text-text-muted">Trazabilidad</p>
        <h2 className="mt-1 text-lg font-semibold text-text-strong">Historial de facturacion</h2>
        <p className="mt-1 text-sm text-text-muted">
          Cada cambio de estado de tu suscripcion queda registrado aqui, ya sea automatico o manual.
        </p>
      </div>

      <Table mobile="cards">
        <thead>
          <tr>
            <TableHeaderCell>Evento</TableHeaderCell>
            <TableHeaderCell>Detalle</TableHeaderCell>
            <TableHeaderCell align="right">Fecha</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <TableEmptyRow colSpan={3}>Todavia no hay eventos de facturacion registrados.</TableEmptyRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell mobileLabel="Evento">{reasonLabel(entry.reason)}</TableCell>
                <TableCell mobileLabel="Detalle" className="text-text-muted">
                  {entry.changed_by_email === "system@scheduler" ? "Accion automatica del sistema" : entry.changed_by_email}
                </TableCell>
                <TableCell mobileLabel="Fecha" align="right">
                  {formatDateTimeShort(entry.created_at)}
                </TableCell>
              </TableRow>
            ))
          )}
        </tbody>
      </Table>
    </section>
  );
}
