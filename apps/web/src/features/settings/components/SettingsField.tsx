import type { ReactNode } from "react";

/** Campo de Configuración: etiqueta, "(opcional)", ayuda y error debajo (como el formulario de producto). */
export function SettingsField({
  id,
  label,
  optional = false,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-text-body">
        {label} {optional ? <span className="font-normal text-text-muted">(opcional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-status-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Tarjeta de una parte de la sección. */
export function SettingsCard({ title, description, children }: { title?: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-app-border bg-app-surface p-4 sm:p-5">
      {title ? (
        <div>
          <h2 className="text-[15px] font-bold text-text-strong">{title}</h2>
          {description ? <p className="text-[13px] text-text-muted">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** "Cambios sin guardar · Descartar · Guardar": fijo abajo mientras haya cambios (tablero A · Datos de la tienda). */
export function UnsavedBar({ saving, onDiscard, formId }: { saving: boolean; onDiscard: () => void; formId: string }) {
  return (
    <div
      role="region"
      aria-label="Cambios sin guardar"
      className="sticky bottom-[calc(env(safe-area-inset-bottom)+104px)] z-20 flex items-center justify-between gap-3 rounded-card border border-app-borderStrong bg-app-surface px-4 py-3 shadow-floating sm:bottom-4"
    >
      <span className="text-sm font-semibold text-text-strong">Cambios sin guardar</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDiscard}
          disabled={saving}
          className="h-10 rounded-control px-3 text-sm font-semibold text-text-body hover:bg-app-surface-muted disabled:opacity-50"
        >
          Descartar
        </button>
        <button
          type="submit"
          form={formId}
          disabled={saving}
          className="h-10 rounded-control bg-brand-700 px-4 text-sm font-bold text-text-inverse hover:bg-brand-800 disabled:bg-app-borderStrong"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
