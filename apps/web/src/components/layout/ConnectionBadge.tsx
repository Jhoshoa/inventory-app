"use client";

import { useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useConnectionStatus } from "@/lib/offline/useConnectionStatus";
import { SyncConflictsDialog } from "./SyncConflictsDialog";

export function ConnectionBadge() {
  const { isOnline, isSyncing, pendingCount, conflictCount, syncNow, refreshCounts } = useConnectionStatus();
  const [reviewOpen, setReviewOpen] = useState(false);

  const dialog = <SyncConflictsDialog open={reviewOpen} onOpenChange={setReviewOpen} onResolved={refreshCounts} />;

  if (isOnline && pendingCount === 0 && conflictCount === 0 && !isSyncing) {
    return reviewOpen ? dialog : null;
  }

  if (!isOnline) {
    return (
      <button
        type="button"
        onClick={() => void syncNow()}
        className="inline-flex items-center gap-1.5 rounded-md border border-status-warningBorder bg-status-warningBg px-2 py-1 text-xs font-medium text-status-warning"
        title="Sin conexion. Las ventas se guardan en este dispositivo y se enviaran al reconectar."
      >
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        Sin conexion{pendingCount > 0 ? ` · ${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}` : ""}
      </button>
    );
  }

  if (conflictCount > 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-status-dangerBorder bg-status-dangerBg px-2 py-1 text-xs font-medium text-status-danger"
          title="Ventas offline que no se pudieron sincronizar automaticamente. Clic para revisar."
        >
          {conflictCount} venta{conflictCount === 1 ? "" : "s"} requiere revision
        </button>
        {dialog}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void syncNow()}
        className="inline-flex items-center gap-1.5 rounded-md border border-status-infoBorder bg-status-infoBg px-2 py-1 text-xs font-medium text-status-info"
        title="Sincronizando ventas pendientes"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} aria-hidden="true" />
        {isSyncing ? "Sincronizando..." : `${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}`}
      </button>
      {reviewOpen ? dialog : null}
    </>
  );
}
