"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LockKeyhole, Store, UnlockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatBusinessDateShort, formatDateTimeWithTimezone } from "@/lib/format/datetime";
import { canOpenCloseStore } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import type { CashMovementListResult, StoreDay, StoreDayClosingPreviewResult } from "../types";
import { StoreDayActionForm } from "./StoreDayActionForm";

export { toMoneyInputValue } from "../utils/store-day-helpers";

export function StoreDayStatusPanel({
  storeDay,
  role,
  actions = "none",
  closingPreview,
  cashMovements,
}: {
  storeDay: StoreDay;
  role: UserRole;
  actions?: "none" | "link" | "manage";
  closingPreview?: StoreDayClosingPreviewResult;
  cashMovements?: CashMovementListResult;
}) {
  const [visibleStoreDay, setVisibleStoreDay] = useState(storeDay);
  const didMountRef = useRef(false);
  const isOpen = visibleStoreDay.status === "open";
  const canManage = canOpenCloseStore(role);
  const handleStoreDayUpdated = useCallback((nextStoreDay: StoreDay) => {
    setVisibleStoreDay(nextStoreDay);
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setVisibleStoreDay(storeDay);
  }, [storeDay]);

  return (
    <section className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-md border ${
              isOpen
                ? "border-status-successBorder bg-status-successBg text-status-success"
                : "border-status-warningBorder bg-status-warningBg text-status-warning"
            }`}
          >
            {isOpen ? <UnlockKeyhole className="h-5 w-5" aria-hidden={true} /> : <LockKeyhole className="h-5 w-5" aria-hidden={true} />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-text-strong">
                {isOpen ? "Tienda abierta" : "Tienda cerrada"}
              </h2>
              <Badge>{formatBusinessDateShort(visibleStoreDay.business_date)}</Badge>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              {isOpen && visibleStoreDay.opened_at
                ? `Abierta desde ${formatDateTimeWithTimezone(visibleStoreDay.opened_at, visibleStoreDay.timezone)}`
                : "Abre la jornada para habilitar ventas en POS."}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-text-muted">
              <Store className="h-3.5 w-3.5" aria-hidden={true} />
              Zona operativa: {visibleStoreDay.timezone}
            </p>
          </div>
        </div>

        {canManage && actions === "manage" ? (
          <StoreDayActionForm
            key={`${visibleStoreDay.status}-${visibleStoreDay.id ?? "none"}-${visibleStoreDay.opened_at ?? ""}-${visibleStoreDay.closed_at ?? ""}`}
            storeDay={visibleStoreDay}
            closingPreview={closingPreview}
            cashMovements={cashMovements}
            onStoreDayUpdated={handleStoreDayUpdated}
          />
        ) : null}
        {canManage && actions === "link" ? (
          <Button asChild variant="secondary">
            <Link href="/dashboard/settings">Gestionar jornada</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
