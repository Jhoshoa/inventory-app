"use client";

import { useEffect, useId, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { activePreset, presetRange, RANGE_PRESETS, STATUS_CHIPS, validateRange } from "../list";
import type { SaleStatusFilter } from "../types";

export interface SalesFilterValue {
  from_date: string;
  to_date: string;
  status: SaleStatusFilter;
}

/**
 * Filtros de Ventas (tablero P06). Celular: chips Hoy · Ayer · 7 días · Elegir fechas y
 * debajo el estado. Desde 768 px: Desde y Hasta con los chips de estado al lado.
 * Las fechas se validan antes de pedir (desde ≤ hasta, no antes del primer día, 90 días).
 */
export function SalesFilters({
  value,
  today,
  firstBusinessDate,
  voidedCount,
  onChange,
}: {
  value: SalesFilterValue;
  today: string;
  firstBusinessDate: string | null;
  voidedCount: number | null;
  onChange: (next: SalesFilterValue) => void;
}) {
  const preset = activePreset(value.from_date, value.to_date, today, firstBusinessDate);
  const [customOpen, setCustomOpen] = useState(preset === "custom");
  const [from, setFrom] = useState(value.from_date);
  const [to, setTo] = useState(value.to_date);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  // Un chip o "Volver" cambian el rango desde afuera: las fechas escritas lo siguen.
  useEffect(() => {
    setFrom(value.from_date);
    setTo(value.to_date);
    setError(null);
  }, [value.from_date, value.to_date]);

  function applyDates(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    const invalid = validateRange(nextFrom, nextTo, firstBusinessDate);
    setError(invalid);
    if (!invalid && (nextFrom !== value.from_date || nextTo !== value.to_date)) {
      onChange({ ...value, from_date: nextFrom, to_date: nextTo });
    }
  }

  const dateInputs = (
    <div className="grid grid-cols-2 gap-2 md:flex">
      <DateField label="Desde" value={from} min={firstBusinessDate ?? undefined} max={today} invalid={Boolean(error)} errorId={errorId} onChange={(next) => applyDates(next, to)} />
      <DateField label="Hasta" value={to} min={firstBusinessDate ?? undefined} max={today} invalid={Boolean(error)} errorId={errorId} onChange={(next) => applyDates(from, next)} />
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Fechas" className="flex flex-wrap gap-1.5 md:hidden">
        {RANGE_PRESETS.map((item) => {
          const range = presetRange(item.value, today, firstBusinessDate);
          return (
            <Chip
              key={item.value}
              pressed={!customOpen && preset === item.value}
              disabled={!range}
              onClick={() => {
                if (!range) return;
                setCustomOpen(false);
                onChange({ ...value, ...range });
              }}
            >
              {item.label}
            </Chip>
          );
        })}
        <Chip pressed={customOpen || preset === "custom"} onClick={() => setCustomOpen((open) => !open)}>
          Elegir fechas
        </Chip>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <div className={customOpen ? "" : "max-md:hidden"}>{dateInputs}</div>
        <div role="group" aria-label="Estado" className="flex flex-wrap gap-1.5 md:pb-0.5">
          {STATUS_CHIPS.map((item) => (
            <Chip
              key={item.value}
              pressed={value.status === item.value}
              className="max-md:h-[30px]"
              onClick={() => value.status !== item.value && onChange({ ...value, status: item.value })}
            >
              {item.value === "voided" && voidedCount ? `${item.label} · ${voidedCount}` : item.label}
            </Chip>
          ))}
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
  min,
  max,
  invalid,
  errorId,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max: string;
  invalid: boolean;
  errorId: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-text-body">
        {label}
      </label>
      <Input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="!h-[38px] md:!w-[150px]"
      />
    </div>
  );
}
