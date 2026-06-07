"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { ResponsiveToolbar } from "@/components/layout/ResponsiveToolbar";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ReportSearchParams, ReportRangePreset } from "../types";
import { datesForReportRange } from "../schemas";

export function DateRangeFilter({ params }: { params: ReportSearchParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const updateParams = useCallback((updates: Record<string, string>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.set("offset", "0");

    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }, [pathname, router]);

  return (
    <ResponsiveToolbar className="md:grid md:grid-cols-[180px_minmax(160px,1fr)_minmax(160px,1fr)]">
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase text-text-muted">
          Rango
        </span>
        <Select
          aria-label="Rango de reportes"
          value={params.range}
          onChange={(event) => {
            const range = event.target.value as ReportRangePreset;
            updateParams({ range, ...datesForReportRange(range, new Date()) });
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
        value={params.from}
        onChange={(value) => updateParams({ range: "custom", from: value })}
      />
      <DateInput
        label="Hasta"
        value={params.to}
        onChange={(value) => updateParams({ range: "custom", to: value })}
      />
    </ResponsiveToolbar>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}
