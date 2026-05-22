import { Clock3 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import type { StoreDayEventListResult } from "../types";

const labels: Record<string, string> = {
  open: "Apertura",
  close: "Cierre",
  reopen: "Reapertura",
};

export function StoreDayEventTimeline({ events }: { events: StoreDayEventListResult }) {
  if (!events.ok) {
    return <Alert variant="error">No se pudo cargar el historial de jornada: {events.error.message}</Alert>;
  }

  if (events.data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Sin eventos de jornada para hoy.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <ol className="space-y-3">
        {events.data.map((event) => (
          <li key={event.id} className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <Clock3 className="h-4 w-4" aria-hidden={true} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-950">{labels[event.event_type] ?? event.event_type}</p>
              <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(event.created_at)}</p>
              {event.note ? <p className="mt-1 text-sm text-slate-600">{event.note}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
