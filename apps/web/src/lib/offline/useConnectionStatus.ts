"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOfflineDb } from "./db";
import { runFullSync, seedCatalogIfEmpty } from "./syncEngine";

/** Cada cuánto se reintenta enviar lo pendiente. */
const RETRY_MS = 30_000;

export interface ConnectionStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  conflictCount: number;
  lastSyncedAt: string | null;
  syncNow: () => Promise<void>;
  refreshCounts: () => Promise<void>;
}

export function useConnectionStatus(): ConnectionStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const pendingRef = useRef(0);
  pendingRef.current = pendingCount;

  const refreshCounts = useCallback(async () => {
    try {
      const db = getOfflineDb();
      const [pending, conflicts] = await Promise.all([
        db.pendingSales.where("status").anyOf("pending", "syncing").count(),
        db.pendingSales.where("status").anyOf("conflict", "rejected").count(),
      ]);
      setPendingCount(pending);
      setConflictCount(conflicts);
    } catch {
      // IndexedDB no disponible (modo privado, navegador incompatible): degradar en silencio.
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setIsSyncing(true);
    try {
      await seedCatalogIfEmpty();
      await runFullSync();
      setLastSyncedAt(new Date().toISOString());
    } catch {
      // IndexedDB no disponible o sync fallo: se reintenta en el proximo ciclo.
    } finally {
      setIsSyncing(false);
      await refreshCounts();
    }
  }, [refreshCounts]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    void refreshCounts();

    function handleOnline() {
      setIsOnline(true);
      void syncNow();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) void syncNow();

    const interval = window.setInterval(() => {
      void refreshCounts();
    }, 8000);
    // Con ventas por enviar y conexión, se reintenta solo (por si un envío falló a medias).
    const retry = window.setInterval(() => {
      if (navigator.onLine && pendingRef.current > 0) void syncNow();
    }, RETRY_MS);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearInterval(interval);
      window.clearInterval(retry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isOnline, isSyncing, pendingCount, conflictCount, lastSyncedAt, syncNow, refreshCounts };
}
