import { describe, expect, it } from "vitest";
import type { BillingStatus } from "./api/billing";
import { historyLine, planCard, planFacts } from "./billing";

const base: BillingStatus = {
  subscription_status: "trial",
  access_status: "active",
  trial_expires_at: "2026-11-19T23:59:00Z",
  days_until_trial_ends: 9,
  next_billing_date: null,
  days_until_next_billing: null,
  grace_days_remaining: null,
  is_trial: true,
  is_expired: false,
  should_warn: false,
};

describe("Plan y pagos", () => {
  it("shows the trial with its days and end date", () => {
    expect(planCard(base)).toMatchObject({
      title: "Prueba gratis",
      headline: "Quedan 9 días",
      detail: "Tu prueba termina el 19/11/2026. Para seguir usando la tienda, pide tu plan antes de esa fecha.",
      tone: "info",
    });
    expect(planCard({ ...base, days_until_trial_ends: 2 }).tone).toBe("warning");
    expect(planFacts(base)).toEqual([
      ["Suscripción", "Prueba"],
      ["Acceso", "Activo"],
      ["Fin de la prueba", "19/11/2026"],
      ["Próxima facturación", "—"],
    ]);
  });

  it("shows active, grace and suspended", () => {
    expect(planCard({ ...base, subscription_status: "active", next_billing_date: "2026-12-10" })).toMatchObject({
      title: "Activo",
      headline: "Próximo pago 10/12",
      tone: "success",
    });
    expect(planCard({ ...base, subscription_status: "past_due", grace_days_remaining: 3 })).toMatchObject({
      title: "En gracia",
      headline: "Quedan 3 días para pagar",
      tone: "warning",
    });
    expect(planCard({ ...base, subscription_status: "expired", access_status: "suspended" })).toMatchObject({
      title: "Suspendido",
      headline: "Solo puedes ver y pagar",
      tone: "danger",
    });
  });

  it("writes each history line", () => {
    expect(
      historyLine({ id: "1", reason: "trial_expired", changed_by_email: "system@scheduler", old_values: {}, new_values: {}, created_at: "2026-11-01T12:00:00Z" }),
    ).toEqual({ date: "01/11", reason: "Terminó la prueba", who: "Sistema" });
    expect(
      historyLine({ id: "2", reason: "payment_requested", changed_by_email: "rosa@x.com", old_values: {}, new_values: {}, created_at: "2026-11-05T12:00:00Z" }),
    ).toEqual({ date: "05/11", reason: "Pediste pagar por WhatsApp", who: "rosa@x.com" });
  });
});
