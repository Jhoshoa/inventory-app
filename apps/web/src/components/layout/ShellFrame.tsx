"use client";

import { usePathname } from "next/navigation";
import { usesNarrowSidebar } from "./navigation";

/** Deja lugar a la barra lateral (o a la angosta) y, en el celular, a la barra de abajo. */
export function ShellFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const sidebar = usesNarrowSidebar(pathname) ? "sm:pl-24" : "sm:pl-24 lg:pl-60";
  return <div className={`min-h-screen pb-24 sm:pb-0 print:pb-0 print:pl-0 ${sidebar}`}>{children}</div>;
}
