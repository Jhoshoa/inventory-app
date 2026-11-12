import Link from "next/link";
import { ChevronLeft, Info } from "lucide-react";
import { MoreParentLink } from "@/components/layout/MoreParentLink";
import type { UserRole } from "@/lib/auth/types";
import { REPORT_SECTIONS, sectionHref, visibleSections, type ReportSection } from "../sections";
import type { ReportSearchParams } from "../types";
import { ReportRangeFilter } from "./ReportRangeFilter";

/**
 * Arriba de cada sección de Reportes (tablero P08). Escritorio y tablet: "Reportes", el
 * rango y las pestañas, que comparten el rango. Celular: el título de la sección y, en
 * las secciones, "‹ Reportes" para volver (los accesos están al pie de Ventas).
 */
export function ReportsHeader({
  section,
  role,
  params,
  showRange = true,
  firstDayNote = null,
}: {
  section: ReportSection;
  role: UserRole;
  params: ReportSearchParams;
  showRange?: boolean;
  /** "Tu tienda abrió el …": la API recortó el inicio del rango al primer día (E14). */
  firstDayNote?: string | null;
}) {
  const current = REPORT_SECTIONS.find((item) => item.key === section)!;
  const tabs = visibleSections(role);

  return (
    <div className="flex flex-col gap-3">
      <header className="min-w-0">
        {section === "ventas" ? (
          <MoreParentLink />
        ) : (
          <Link
            href={sectionHref("ventas", params)}
            className="-ml-1 mb-1 inline-flex min-h-9 items-center gap-0.5 rounded-[10px] pr-2 text-[13px] font-semibold text-text-muted hover:text-text-strong md:hidden"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Reportes
          </Link>
        )}
        <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">
          <span className="md:hidden">{section === "ventas" ? "Reportes" : current.label}</span>
          <span className="max-md:hidden">Reportes</span>
        </h1>
      </header>

      {showRange ? <ReportRangeFilter params={params} /> : null}

      {firstDayNote ? (
        <p role="status" className="flex items-start gap-2 text-sm text-text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {firstDayNote}
        </p>
      ) : null}

      {tabs.length > 1 ? (
        <nav aria-label="Secciones de reportes" className="border-b border-app-border max-md:hidden">
          <ul className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const active = tab.key === section;
              return (
                <li key={tab.key}>
                  <Link
                    href={sectionHref(tab.key, params)}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex h-10 items-center whitespace-nowrap border-b-2 px-2 text-[13px] font-semibold lg:px-3 lg:text-sm ${
                      active ? "border-brand-700 text-text-strong" : "border-transparent text-text-muted hover:text-text-strong"
                    }`}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

/** "Tu tienda abrió el 05/11/2026; el reporte empieza ese día." si la API recortó el rango. */
export function firstDayNote(requestedFrom: string, actualFrom: string | null | undefined) {
  if (!actualFrom || actualFrom <= requestedFrom) return null;
  const [year, month, day] = actualFrom.slice(0, 10).split("-");
  return `Tu tienda abrió el ${day}/${month}/${year}; el reporte empieza ese día.`;
}
