"use client";

interface TrialBannerProps {
  daysUntilTrialEnds: number | null;
}

export function TrialBanner({ daysUntilTrialEnds }: TrialBannerProps) {
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
      : `Tu periodo de prueba termina en ${daysUntilTrialEnds} dias. Adquiere un plan para no perder acceso.`;

  return (
    <div className="rounded-md border border-status-warningBorder bg-status-warningBg px-4 py-3 text-sm font-medium text-status-warning">
      {message}
    </div>
  );
}
