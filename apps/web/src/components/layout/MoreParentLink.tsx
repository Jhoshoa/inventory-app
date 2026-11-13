"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { moreParentFor } from "./navigation";

/** En el celular, lo que se abre desde Más muestra "‹ Más" arriba del título (tablero P00). */
export function MoreParentLink() {
  const parent = moreParentFor(usePathname() ?? "");
  if (!parent) return null;
  return (
    <Link
      href={parent.href}
      className="tap-area -ml-1 mb-1 inline-flex min-h-9 items-center gap-0.5 rounded-[10px] pr-2 text-[13px] font-semibold text-text-muted hover:text-text-strong sm:hidden"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      {parent.label}
    </Link>
  );
}
