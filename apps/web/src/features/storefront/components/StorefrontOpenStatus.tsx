"use client";

import { useEffect, useState } from "react";
import { isOpenNow, type StorefrontDayHours } from "../settings";

/** "Abierto ahora" se calcula en el navegador: la pagina se sirve desde cache. */
export function StorefrontOpenStatus({ hours, timezone }: { hours: StorefrontDayHours[]; timezone: string }) {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setOpen(isOpenNow(hours, timezone));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [hours, timezone]);

  if (open === null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        open ? "bg-status-successBg text-status-success" : "bg-app-surface-muted text-text-muted"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-status-success" : "bg-text-disabled"}`} aria-hidden="true" />
      {open ? "Abierto ahora" : "Cerrado ahora"}
    </span>
  );
}
