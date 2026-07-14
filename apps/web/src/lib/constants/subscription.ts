export type SubscriptionStatus = "trial" | "active" | "past_due" | "expired" | "canceled";

export const SUBSCRIPTION_LABELS: Record<string, string> = {
  trial: "Prueba",
  active: "Suscripto",
  past_due: "Vencido",
  expired: "Suspendido",
  canceled: "Cancelado",
};

export const SUBSCRIPTION_VARIANTS: Record<string, "info" | "success" | "warning" | "danger" | "default"> = {
  trial: "info",
  active: "success",
  past_due: "warning",
  expired: "danger",
  canceled: "default",
};
