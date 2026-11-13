import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { SETTINGS_GROUPS, settingsSection, type SettingsSectionKey } from "../sections";

/**
 * Título de una sección de Configuración. En el celular "‹ Configuración" para volver
 * (tablero P10); en escritorio el grupo arriba del título ("Tu negocio").
 */
export function SettingsHeader({
  section,
  description,
  actions,
  backHref = "/dashboard/settings",
  backLabel = "Configuración",
}: {
  section: SettingsSectionKey;
  description?: string;
  actions?: ReactNode;
  /** El cajero llega a Mi perfil desde Más. */
  backHref?: string;
  backLabel?: string;
}) {
  const current = settingsSection(section);
  const group = SETTINGS_GROUPS.find((item) => item.sections.some((entry) => entry.key === section));
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <Link
          href={backHref}
          className="tap-area -ml-1 mb-1 inline-flex min-h-9 items-center gap-0.5 rounded-[10px] pr-2 text-[13px] font-semibold text-text-muted hover:text-text-strong md:hidden"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </Link>
        {group ? <p className="text-xs font-bold uppercase tracking-wide text-text-muted max-md:hidden">{group.title}</p> : null}
        <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">{current.label}</h1>
        {description ? <p className="text-sm text-text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
