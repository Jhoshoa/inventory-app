import { Clock3 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import type { StoreDayEventListResult } from "../types";

const labels: Record<string, string> = {
  open: "Apertura",
  close: "Cierre",
  reopen: "Reapertura",
};

export function StoreDayEventTimeline({
  events,
  timezone = "UTC",
}: {
  events: StoreDayEventListResult;
  timezone?: string;
}) {
  if (!events.ok) {
    return <Alert variant="error">No se pudo cargar el historial de jornada: {events.error.message}</Alert>;
  }

  if (events.data.length === 0) {
    return (
      <CollapsibleSection title="Historial de jornada" description="Aperturas, cierres y reaperturas recientes.">
        <p className="text-sm text-slate-600">Sin eventos de jornada para hoy.</p>
      </CollapsibleSection>
    );
  }

  const sortedEvents = [...events.data].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );

  return (
    <CollapsibleSection title="Historial de jornada" description="Del evento mas reciente al mas antiguo.">
      <ol className="space-y-3">
        {sortedEvents.map((event) => (
          <li key={event.id} className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <Clock3 className="h-4 w-4" aria-hidden={true} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-950">{labels[event.event_type] ?? event.event_type}</p>
              <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(event.created_at, timezone)}</p>
              {event.note ? <p className="mt-1 text-sm text-slate-600">{event.note}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </CollapsibleSection>
  );
}

function formatDateTime(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  const day = part("day");
  const month = part("month");
  const year = part("year");
  const hour = part("hour");
  const minute = part("minute");
  if (!day || !month || !year || !hour || !minute) return value;
  return `${day}/${month}/${year}, ${hour}:${minute}`;
}
