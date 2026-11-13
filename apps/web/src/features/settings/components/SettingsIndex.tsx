"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { filterSettingsGroups, type SettingsSectionKey } from "../sections";

export interface SettingsIndexRow {
  summary?: string;
  tag?: { label: string; tone: "success" | "muted" | "warning" };
}

const TAG_TONE = {
  success: "bg-status-successBg text-status-success",
  muted: "bg-app-surface-muted text-text-muted",
  warning: "bg-status-warningBg text-status-warning",
} as const;

/**
 * Índice de Configuración (tablero P10): la tienda y el plan arriba, el buscador y los
 * tres grupos. Cada fila abre su sección.
 */
export function SettingsIndex({
  storeName,
  plan,
  rows,
}: {
  storeName: string;
  plan: string | null;
  rows: Partial<Record<SettingsSectionKey, SettingsIndexRow>>;
}) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const groups = filterSettingsGroups(query);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Configuración</h1>

      <div className="flex items-center justify-between gap-3 rounded-card border border-app-border bg-app-surface px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-text-strong">{storeName}</p>
          {plan ? <p className="text-[13px] text-text-muted">{plan}</p> : null}
        </div>
        <Link href="/dashboard/settings/billing" className="shrink-0 text-sm font-bold text-brand-700 hover:underline">
          Ver planes
        </Link>
      </div>

      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Buscar en Configuración
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
        <Input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar: WhatsApp, descuentos, cajero…"
          className="pl-9"
        />
      </div>

      {groups.length === 0 ? (
        <p role="status" className="rounded-card border border-app-border bg-app-surface px-4 py-6 text-center text-sm text-text-muted">
          Nada coincide con &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.title} aria-labelledby={`settings-${group.title}`} className="flex flex-col gap-2">
            <h2 id={`settings-${group.title}`} className="px-1 text-xs font-bold uppercase tracking-wide text-text-muted">
              {group.title}
            </h2>
            <ul className="divide-y divide-app-border overflow-hidden rounded-card border border-app-border bg-app-surface">
              {group.sections.map((section) => {
                const row = rows[section.key];
                return (
                  <li key={section.key}>
                    <Link href={section.href} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5 hover:bg-app-surface-muted">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-50 text-[13px] font-extrabold text-brand-700" aria-hidden="true">
                        {section.badge}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-text-strong">{section.label}</span>
                        <span className="block truncate text-[13px] text-text-muted">{row?.summary ?? section.hint}</span>
                      </span>
                      {row?.tag ? (
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${TAG_TONE[row.tag.tone]}`}>{row.tag.label}</span>
                      ) : null}
                      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-text-disabled" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
