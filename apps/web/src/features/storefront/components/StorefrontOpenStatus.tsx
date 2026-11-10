"use client";

import { useEffect, useState } from "react";
import { isOpenNow, type StorefrontDayHours } from "../settings";

/** "Abierto ahora" se calcula en el navegador: la pagina se sirve desde cache. */
export function StorefrontOpenStatus({
  hours,
  timezone,
  short = false,
  className = "",
}: {
  hours: StorefrontDayHours[];
  timezone: string;
  /** "ABIERTO" en vez de "ABIERTO AHORA", para el celular. */
  short?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const update = () => setOpen(isOpenNow(hours, timezone));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [hours, timezone]);

  if (open === null) return null;
  const label = open ? "ABIERTO" : "CERRADO";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`h-2 w-2 rounded-full ${open ? "bg-[#0E7A3E]" : "bg-sf-line"}`} aria-hidden="true" />
      {short ? label : `${label} AHORA`}
    </span>
  );
}
