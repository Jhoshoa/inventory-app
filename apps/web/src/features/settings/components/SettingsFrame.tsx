"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { SettingsSectionKey } from "../sections";
import { SettingsMenu } from "./SettingsMenu";

/**
 * Menú de Configuración a la izquierda y la sección a la derecha. El catálogo trae su
 * propio menú de partes y la vista previa (tablero P11): ahí va a lo ancho.
 */
export function SettingsFrame({ badges, children }: { badges: Partial<Record<SettingsSectionKey, string>>; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/dashboard/settings/catalogo")) return <>{children}</>;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="max-md:hidden">
        <SettingsMenu badges={badges} />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
