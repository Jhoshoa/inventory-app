interface TrialBannerProps {
  subscriptionStatus: string | null;
  daysUntilTrialEnds: number | null;
  graceDaysRemaining: number | null;
}

export function TrialBanner({
  subscriptionStatus,
  daysUntilTrialEnds,
  graceDaysRemaining,
}: TrialBannerProps) {
  if (subscriptionStatus === "active") return null;

  if (subscriptionStatus === "past_due") {
    const message =
      graceDaysRemaining !== null && graceDaysRemaining <= 1
        ? graceDaysRemaining === 1
          ? "Tu suscripción vence mañana. Renueva tu plan para no perder acceso."
          : "Tu periodo de gracia ha terminado. Renueva tu plan para recuperar el acceso."
        : `Tu suscripción está vencida. Quedan ${graceDaysRemaining} días de gracia.`;

    return (
      <div className="rounded-md border border-status-warningBorder bg-status-warningBg px-4 py-3 text-sm font-medium text-status-warning">
        {message}
      </div>
    );
  }

  if (subscriptionStatus === "expired") {
    return (
      <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm font-medium text-status-danger">
        Tu acceso ha sido suspendido. Adquiere un plan para continuar usando la aplicacion.
      </div>
    );
  }

  if (subscriptionStatus === "trial") {
    if (daysUntilTrialEnds === null || daysUntilTrialEnds > 7) return null;

    if (daysUntilTrialEnds <= 0) {
      return (
        <div className="rounded-md border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm font-medium text-status-danger">
          Tu periodo de prueba ha expirado.
          Adquiere un plan para continuar usando la aplicacion.
        </div>
      );
    }

    const message =
      daysUntilTrialEnds === 1
        ? "Tu periodo de prueba termina mañana. Adquiere un plan para no perder acceso."
        : `Tu periodo de prueba termina en ${daysUntilTrialEnds} días. Adquiere un plan para no perder acceso.`;

    return (
      <div className="rounded-md border border-status-warningBorder bg-status-warningBg px-4 py-3 text-sm font-medium text-status-warning">
        {message}
      </div>
    );
  }

  return null;
}
