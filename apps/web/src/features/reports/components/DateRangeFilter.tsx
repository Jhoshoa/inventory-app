"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { ResponsiveToolbar } from "@/components/layout/ResponsiveToolbar";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ReportSearchParams, ReportRangePreset } from "../types";
import { datesForReportRange } from "../schemas";

export function DateRangeFilter({
  params,
  firstBusinessDate,
}: {
  params: ReportSearchParams;
  firstBusinessDate: string | null;
}) {
  const pathname = usePathname();
  const [range, setRange] = useState(params.range);
  const [from, setFrom] = useState(params.from);
  const [to, setTo] = useState(params.to);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRange(params.range);
    setFrom(params.from);
    setTo(params.to);
    setError(null);
  }, [params.from, params.range, params.to]);

  function validateRange(nextValues: {
    from: string;
    to: string;
  }) {
    if (nextValues.from && nextValues.to && nextValues.from > nextValues.to) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      return false;
    }

    if (
      firstBusinessDate &&
      ((nextValues.from && nextValues.from < firstBusinessDate) ||
        (nextValues.to && nextValues.to < firstBusinessDate))
    ) {
      setError(`La fecha minima disponible es ${firstBusinessDate}.`);
      return false;
    }

    setError(null);
    return true;
  }

  function submitIfValid(form: HTMLFormElement, nextValues: { from: string; to: string }) {
    if (!validateRange(nextValues)) return;
    form.requestSubmit();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const formFrom = String(formData.get("from") ?? "");
    const formTo = String(formData.get("to") ?? "");

    if (!validateRange({ from: formFrom, to: formTo })) {
      event.preventDefault();
    }
  }

  function onRangeChange(nextRange: ReportRangePreset, form: HTMLFormElement) {
    setRange(nextRange);
    const dates = datesForReportRange(nextRange, new Date());
    setFrom(dates.from);
    setTo(dates.to);
    setDateControl(form, "from", dates.from);
    setDateControl(form, "to", dates.to);
    submitIfValid(form, dates);
  }

  return (
    <form action={pathname} method="get" onSubmit={onSubmit}>
      <input type="hidden" name="offset" value="0" />
      <ResponsiveToolbar className="md:grid md:grid-cols-[180px_minmax(160px,1fr)_minmax(160px,1fr)]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase text-text-muted">
            Rango
          </span>
          <Select
            aria-label="Rango de reportes"
            name="range"
            value={range}
            onChange={(event) => {
              if (event.currentTarget.form) {
                onRangeChange(
                  event.target.value as ReportRangePreset,
                  event.currentTarget.form,
                );
              }
            }}
          >
            <option value="today">Hoy</option>
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="month">Mes actual</option>
            <option value="custom">Personalizado</option>
          </Select>
        </label>
        <DateInput
          label="Desde"
          name="from"
          value={from}
          onChange={(value, form) => {
            setRange("custom");
            setFrom(value);
            setRangeControl(form, "custom");
            submitIfValid(form, { from: value, to });
          }}
        />
        <DateInput
          label="Hasta"
          name="to"
          value={to}
          onChange={(value, form) => {
            setRange("custom");
            setTo(value);
            setRangeControl(form, "custom");
            submitIfValid(form, { from, to: value });
          }}
        />
      </ResponsiveToolbar>
      {firstBusinessDate ? (
        <p className="mt-2 text-xs text-text-muted">
          La fecha minima disponible es {firstBusinessDate}.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm font-medium text-danger-700" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function DateInput({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string, form: HTMLFormElement) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase text-text-muted">
        {label}
      </span>
      <span className="relative block">
        <CalendarDays
          className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted"
          aria-hidden
        />
        <Input
          className="pl-9"
          type="date"
          name={name}
          value={value}
          onChange={(event) => {
            if (event.currentTarget.form) {
              onChange(event.target.value, event.currentTarget.form);
            }
          }}
        />
      </span>
    </label>
  );
}

function setRangeControl(form: HTMLFormElement, value: ReportRangePreset) {
  const control = form.elements.namedItem("range");
  if (control instanceof HTMLSelectElement) {
    control.value = value;
  }
}

function setDateControl(form: HTMLFormElement, name: "from" | "to", value: string) {
  const control = form.elements.namedItem(name);
  if (control instanceof HTMLInputElement) {
    control.value = value;
  }
}
