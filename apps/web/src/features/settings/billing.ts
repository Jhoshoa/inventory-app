import type { BillingHistoryEntry, BillingStatus } from "./api/billing";

// Plan y pagos (tablero P12): la tarjeta de arriba cambia según el estado.

export type PlanTone = "info" | "success" | "warning" | "danger";

function dayMonthYear(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function days(count: number) {
  return count === 1 ? "1 día" : `${count} días`;
}

/** Título, cifra grande, explicación y color de la tarjeta del plan. */
export function planCard(billing: BillingStatus): { title: string; headline: string; detail: string; tone: PlanTone; canPay: boolean } {
  const status = billing.subscription_status;
  if (status === "trial") {
    const left = Math.max(billing.days_until_trial_ends ?? 0, 0);
    const end = billing.trial_expires_at ? dayMonthYear(billing.trial_expires_at) : null;
    return {
      title: "Prueba gratis",
      headline: left > 0 ? `Quedan ${days(left)}` : "Termina hoy",
      detail: end ? `Tu prueba termina el ${end}. Para seguir usando la tienda, pide tu plan antes de esa fecha.` : "Para seguir usando la tienda, pide tu plan antes de que termine.",
      tone: left <= 3 ? "warning" : "info",
      canPay: true,
    };
  }
  if (status === "active") {
    const next = billing.next_billing_date ? dayMonthYear(billing.next_billing_date) : null;
    return {
      title: "Activo",
      headline: next ? `Próximo pago ${next.slice(0, 5)}` : "Al día",
      detail: next ? `Tu plan sigue activo hasta el ${next}.` : "Tu plan está al día.",
      tone: "success",
      canPay: true,
    };
  }
  if (status === "past_due") {
    const left = Math.max(billing.grace_days_remaining ?? 0, 0);
    return {
      title: "En gracia",
      headline: left > 0 ? `Quedan ${days(left)} para pagar` : "Último día para pagar",
      detail: "Tu pago está pendiente. Sigues usando la tienda hasta que termine el periodo de gracia.",
      tone: "warning",
      canPay: true,
    };
  }
  return {
    title: "Suspendido",
    headline: "Solo puedes ver y pagar",
    detail: "Paga tu plan para volver a vender y cargar productos. Tus datos están guardados.",
    tone: "danger",
    canPay: true,
  };
}

const SUBSCRIPTION_TEXT: Record<string, string> = {
  trial: "Prueba",
  active: "Activo",
  past_due: "En gracia",
  expired: "Suspendido",
  canceled: "Cancelado",
};

const ACCESS_TEXT: Record<string, string> = {
  active: "Activo",
  suspended: "Suspendido",
  archived: "Archivado",
  purged: "Eliminado",
};

/** Suscripción, acceso y la fecha que importa según el estado. */
export function planFacts(billing: BillingStatus) {
  const rows: [string, string][] = [
    ["Suscripción", SUBSCRIPTION_TEXT[billing.subscription_status] ?? billing.subscription_status],
    ["Acceso", ACCESS_TEXT[billing.access_status] ?? billing.access_status],
  ];
  if (billing.subscription_status === "trial") rows.push(["Fin de la prueba", billing.trial_expires_at ? dayMonthYear(billing.trial_expires_at) : "—"]);
  rows.push(["Próxima facturación", billing.next_billing_date ? dayMonthYear(billing.next_billing_date) : "—"]);
  return rows;
}

const REASON_TEXT: Record<string, string> = {
  payment_requested: "Pediste pagar por WhatsApp",
  trial_started: "Inicio de prueba",
  trial_expired: "Terminó la prueba",
  grace_period_expired: "Terminó el periodo de gracia",
  payment_registered: "Pago registrado",
  subscription_renewed: "Plan renovado",
};

/** "01/11 · Inicio de prueba · Sistema". */
export function historyLine(entry: BillingHistoryEntry) {
  const [, month, day] = entry.created_at.slice(0, 10).split("-");
  const reason = REASON_TEXT[entry.reason] ?? entry.reason.replace(/_/g, " ");
  const who = entry.changed_by_email === "system@scheduler" || !entry.changed_by_email ? "Sistema" : entry.changed_by_email;
  return { date: `${day}/${month}`, reason: reason.charAt(0).toUpperCase() + reason.slice(1), who };
}
