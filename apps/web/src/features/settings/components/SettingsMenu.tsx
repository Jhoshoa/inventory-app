"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_GROUPS, type SettingsSectionKey } from "../sections";

/**
 * Menú de Configuración a la izquierda (escritorio y tablet, tablero A · Configuración).
 * En el celular no va: cada sección tiene "‹ Configuración".
 */
export function SettingsMenu({ badges }: { badges: Partial<Record<SettingsSectionKey, string>> }) {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Secciones de Configuración" className="sticky top-4 flex flex-col gap-4">
      <Link href="/dashboard/settings" className="px-2 text-[15px] font-extrabold text-text-strong hover:underline">
        Configuración
      </Link>
      {SETTINGS_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-text-muted">{group.title}</p>
          {group.sections.map((section) => {
            const active = pathname === section.href || pathname.startsWith(`${section.href}/`);
            const badge = badges[section.key];
            return (
              <Link
                key={section.key}
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-9 items-center justify-between gap-2 rounded-[10px] px-2 text-sm ${
                  active ? "bg-app-surface-muted font-bold text-text-strong" : "font-medium text-text-body hover:bg-app-surface-muted"
                }`}
              >
                <span className="truncate">{section.label}</span>
                {badge ? <span className="shrink-0 rounded-full bg-status-successBg px-2 text-[11px] font-bold text-status-success">{badge}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
