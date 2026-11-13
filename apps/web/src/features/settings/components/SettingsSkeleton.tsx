/** Mientras carga una sección de Configuración: título y dos tarjetas. */
export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando configuración">
      <span className="h-8 w-56 animate-pulse rounded bg-app-surface-muted" />
      <div className="h-24 animate-pulse rounded-card border border-app-border bg-app-surface" />
      <div className="h-56 animate-pulse rounded-card border border-app-border bg-app-surface" />
    </div>
  );
}
