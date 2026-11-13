"use client";

import { useState } from "react";
import { RefreshCw, TriangleAlert, WifiOff } from "lucide-react";
import { useConnectionStatus } from "@/lib/offline/useConnectionStatus";
import { SyncConflictsDialog } from "./SyncConflictsDialog";

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * Franja arriba de todas las páginas (tablero P14): sin conexión, sincronizando
 * o ventas por revisar. Con conexión y nada pendiente no se muestra.
 */
export function ConnectionStrip() {
  const { isOnline, isSyncing, pendingCount, conflictCount, syncNow, refreshCounts } = useConnectionStatus();
  const [reviewOpen, setReviewOpen] = useState(false);

  const dialog = <SyncConflictsDialog open={reviewOpen} onOpenChange={setReviewOpen} onResolved={refreshCounts} />;

  if (isOnline && pendingCount === 0 && conflictCount === 0 && !isSyncing) {
    return reviewOpen ? dialog : null;
  }

  if (!isOnline) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-control border border-status-warningBorder bg-status-warningBg px-3 py-2 text-sm font-semibold text-status-warning"
      >
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">
          Sin conexión
          {pendingCount > 0 ? ` · ${plural(pendingCount, "venta guardada", "ventas guardadas")} en este equipo` : ""}
        </span>
        <span className="hidden text-xs font-medium sm:inline">Se envían solas al volver internet.</span>
      </div>
    );
  }

  if (conflictCount > 0) {
    return (
      <>
        <div
          role="alert"
          className="flex items-center gap-2 rounded-control border border-status-dangerBorder bg-status-dangerBg px-3 py-2 text-sm font-semibold text-status-danger"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{plural(conflictCount, "venta por revisar", "ventas por revisar")}</span>
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="min-h-9 rounded-[10px] border border-status-dangerBorder bg-app-surface px-3 text-[13px] font-bold"
          >
            Revisar
          </button>
        </div>
        {dialog}
      </>
    );
  }

  return (
    <>
      <div
        role="status"
        className="flex items-center gap-2 rounded-control border border-status-infoBorder bg-status-infoBg px-3 py-2 text-sm font-semibold text-status-info"
      >
        <RefreshCw className={`h-4 w-4 shrink-0 ${isSyncing ? "animate-spin" : ""}`} aria-hidden="true" />
        <span className="flex-1">
          {isSyncing ? "Sincronizando…" : `${plural(pendingCount, "venta por enviar", "ventas por enviar")}`}
        </span>
        {!isSyncing ? (
          <button
            type="button"
            onClick={() => void syncNow()}
            className="min-h-9 rounded-[10px] border border-status-infoBorder bg-app-surface px-3 text-[13px] font-bold"
          >
            Enviar ahora
          </button>
        ) : null}
      </div>
      {reviewOpen ? dialog : null}
    </>
  );
}
