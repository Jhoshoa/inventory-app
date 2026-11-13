import type { Session } from "@/lib/auth/session";
import { SUBSCRIPTION_LABELS } from "@/lib/constants/subscription";

/** "Plan Prueba · 9 días" para la barra lateral y Más. */
export function planLine(session: Session) {
  const label = session.subscriptionStatus ? SUBSCRIPTION_LABELS[session.subscriptionStatus] ?? null : null;
  if (!label) return null;
  if (session.subscriptionStatus === "trial" && session.daysUntilTrialEnds !== null && session.daysUntilTrialEnds > 0) {
    return `Plan ${label} · ${session.daysUntilTrialEnds} ${session.daysUntilTrialEnds === 1 ? "día" : "días"}`;
  }
  return `Plan ${label}`;
}
