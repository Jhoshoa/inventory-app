"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { businessDateKey } from "@/features/sales/list";
import { RANGE_CHIPS, datesForReportRange, validateReportRange } from "../schemas";
import type { ReportRangePreset, ReportSearchParams } from "../types";

/**
 * Rango compartido de Reportes (tablero P08): Hoy · 7 días · Mes y "Fechas". En el
 * celular "Fechas" abre Desde / Hasta; desde 768 px las fechas están siempre a la vista.
 * Cambia la dirección (el resto de filtros se mantiene, la página vuelve al inicio).
 */
export function ReportRangeFilter({ params }: { params: ReportSearchParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [customOpen, setCustomOpen] = useState(params.range === "custom");
  const [from, setFrom] = useState(params.from);
  const [to, setTo] = useState(params.to);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const today = businessDateKey();

  useEffect(() => {
    setFrom(params.from);
    setTo(params.to);
    setError(null);
  }, [params.from, params.to]);

  function go(range: ReportRangePreset, nextFrom: string, nextTo: string) {
    const query = new URLSearchParams(searchParams?.toString() ?? "");
    query.set("range", range);
    query.set("from", nextFrom);
    query.set("to", nextTo);
    query.delete("offset");
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  }

  function applyDates(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    const invalid = validateReportRange(nextFrom, nextTo);
    setError(invalid);
    if (!invalid && (nextFrom !== params.from || nextTo !== params.to)) go("custom", nextFrom, nextTo);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-1.5 md:gap-2">
        <div role="group" aria-label="Rango" className="flex flex-wrap gap-1.5">
          {RANGE_CHIPS.map((chip) => (
            <Chip
              key={chip.value}
              pressed={params.range === chip.value && !customOpen}
              onClick={() => {
                setCustomOpen(false);
                const dates = datesForReportRange(chip.value);
                go(chip.value, dates.from, dates.to);
              }}
            >
              {chip.label}
            </Chip>
          ))}
          <Chip pressed={customOpen || params.range === "custom"} className="md:hidden" onClick={() => setCustomOpen((open) => !open)}>
            Fechas
          </Chip>
        </div>
        <div className={`flex items-end gap-2 max-md:w-full ${customOpen ? "" : "max-md:hidden"}`}>
          <DateField label="Desde" value={from} max={today} invalid={Boolean(error)} errorId={errorId} onChange={(value) => applyDates(value, to)} />
          <span className="pb-2.5 text-sm text-text-muted max-md:hidden" aria-hidden="true">
            a
          </span>
          <DateField label="Hasta" value={to} max={today} invalid={Boolean(error)} errorId={errorId} onChange={(value) => applyDates(from, value)} />
        </div>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-status-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function DateField({
  label,
  value,
  max,
  invalid,
  errorId,
  onChange,
}: {
  label: string;
  value: string;
  max: string;
  invalid: boolean;
  errorId: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0 max-md:flex-1">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-text-body md:sr-only">
        {label}
      </label>
      <Input
        id={id}
        type="date"
        value={value}
        max={max}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="!h-[38px] md:!w-[150px]"
      />
    </div>
  );
}
