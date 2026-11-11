import { MapPin } from "lucide-react";
import { LOCATION_KIND_LABEL, type ProductLocationSummary } from "../types";

/** Ubicaciones de un producto, cortas para el POS o completas para el detalle. */
export function LocationList({
  locations,
  compact = false,
  className = "",
}: {
  locations: ProductLocationSummary[] | undefined;
  compact?: boolean;
  className?: string;
}) {
  if (!locations || locations.length === 0) return null;
  if (compact) {
    // En el POS: donde buscarlo primero (exhibicion), y si hay mas, cuantas.
    const [first, ...rest] = [...locations].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "display" ? -1 : 1));
    return (
      <p className={`flex min-w-0 items-center gap-1 text-xs text-text-muted ${className}`}>
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="sr-only">Ubicacion: </span>
        <span className="truncate">{first.label}</span>
        {rest.length > 0 ? <span className="shrink-0">+{rest.length}</span> : null}
      </p>
    );
  }
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {locations.map((location) => (
        <li
          key={`${location.kind}-${location.label}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-app-border bg-app-surface-muted px-2 py-1 text-sm text-text-strong"
        >
          <MapPin className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          {location.label}
          <span className="text-xs text-text-muted">· {LOCATION_KIND_LABEL[location.kind]}</span>
        </li>
      ))}
    </ul>
  );
}
