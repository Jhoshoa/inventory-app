"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { ResponsiveToolbar } from "@/components/layout/ResponsiveToolbar";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { SaleSearchParams } from "../types";

export function SalesDateFilter({
  params,
  firstBusinessDate,
}: {
  params: SaleSearchParams & { from_date: string; to_date: string };
  firstBusinessDate: string | null;
}) {
  const pathname = usePathname();
  const [fromDate, setFromDate] = useState(params.from_date);
  const [toDate, setToDate] = useState(params.to_date);
  const [status, setStatus] = useState(params.status);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFromDate(params.from_date);
    setToDate(params.to_date);
    setStatus(params.status);
    setError(null);
  }, [params.from_date, params.status, params.to_date]);

  function validateRange(nextValues: {
    fromDate: string;
    toDate: string;
  }) {
    if (nextValues.fromDate && nextValues.toDate && nextValues.fromDate > nextValues.toDate) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      return false;
    }

    if (
      firstBusinessDate &&
      ((nextValues.fromDate && nextValues.fromDate < firstBusinessDate) ||
        (nextValues.toDate && nextValues.toDate < firstBusinessDate))
    ) {
      setError(`La fecha minima disponible es ${firstBusinessDate}.`);
      return false;
    }

    setError(null);
    return true;
  }

  function submitIfValid(form: HTMLFormElement, nextValues: { fromDate: string; toDate: string }) {
    if (!validateRange(nextValues)) return;
    form.requestSubmit();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!validateRange({ fromDate, toDate })) {
      event.preventDefault();
    }
  }

  return (
    <form action={pathname} method="get" onSubmit={onSubmit}>
      <input type="hidden" name="offset" value="0" />
      <input type="hidden" name="limit" value={params.limit} />
      <ResponsiveToolbar className="md:grid md:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_180px]">
        <DateInput
          label="Desde"
          name="from_date"
          value={fromDate}
          onChange={(value, form) => {
            setFromDate(value);
            submitIfValid(form, { fromDate: value, toDate });
          }}
        />
        <DateInput
          label="Hasta"
          name="to_date"
          value={toDate}
          onChange={(value, form) => {
            setToDate(value);
            submitIfValid(form, { fromDate, toDate: value });
          }}
        />
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase text-text-muted">
            Estado
          </span>
          <Select
            aria-label="Estado de venta"
            name="status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as SaleSearchParams["status"]);
              if (event.currentTarget.form) {
                submitIfValid(event.currentTarget.form, { fromDate, toDate });
              }
            }}
          >
            <option value="all">Todas</option>
            <option value="completed">Completadas</option>
            <option value="voided">Anuladas</option>
          </Select>
        </label>
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
  onChange,
  value,
}: {
  label: string;
  name: string;
  onChange: (value: string, form: HTMLFormElement) => void;
  value: string;
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
