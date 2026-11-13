import type { BillingHistoryEntry, BillingStatus } from "../api/billing";
import { historyLine, planCard, planFacts, type PlanTone } from "../billing";
import { PaymentRequestButton } from "./PaymentRequestButton";
import { SettingsCard } from "./SettingsField";

const TONE: Record<PlanTone, string> = {
  info: "border-status-infoBorder bg-status-infoBg text-status-info",
  success: "border-status-successBorder bg-status-successBg text-status-success",
  warning: "border-status-warningBorder bg-status-warningBg text-status-warning",
  danger: "border-status-dangerBorder bg-status-dangerBg text-status-danger",
};

/**
 * Plan y pagos (tablero P12): la tarjeta del estado (Prueba, Activo, En gracia,
 * Suspendido) con "Pagar por WhatsApp", los datos de la suscripción y el historial de
 * cambios del plan (no son facturas).
 */
export function PlanOverview({ billing, history }: { billing: BillingStatus; history: BillingHistoryEntry[] }) {
  const card = planCard(billing);
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Estado del plan" className={`flex flex-col gap-2 rounded-card border p-4 sm:p-5 ${TONE[card.tone]}`}>
        <p className="text-sm font-bold">{card.title}</p>
        <p className="text-2xl font-extrabold text-text-strong">{card.headline}</p>
        <p className="text-sm text-text-body">{card.detail}</p>
        {card.canPay ? (
          <div className="pt-1">
            <PaymentRequestButton />
          </div>
        ) : null}
      </section>

      <SettingsCard title="Suscripción">
        <dl className="flex flex-col gap-2 text-sm">
          {planFacts(billing).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-text-muted">{label}</dt>
              <dd className="text-right font-semibold text-text-strong">{value}</dd>
            </div>
          ))}
        </dl>
      </SettingsCard>

      <SettingsCard title="Historial" description="Aquí aparecen pagos registrados, renovaciones y cambios de estado.">
        {history.length === 0 ? (
          <p className="text-sm text-text-muted">Todavía no hay cambios en tu plan.</p>
        ) : (
          <ul className="-my-2 divide-y divide-app-border">
            {history.map((entry) => {
              const line = historyLine(entry);
              return (
                <li key={entry.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="tabular-nums text-text-muted">{line.date}</span> ·{" "}
                    <span className="font-semibold text-text-strong">{line.reason}</span>
                  </span>
                  <span className="shrink-0 truncate text-xs text-text-muted">{line.who}</span>
                </li>
              );
            })}
          </ul>
        )}
      </SettingsCard>
    </div>
  );
}
