"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ReportSearchParams, ReportRangePreset } from "../types";

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
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[180px_1fr_1fr]">
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
          Rango
        </span>
        <Select
          aria-label="Rango de reportes"
          value={params.range}
          onChange={(event) => {
            updateParams({ range: event.target.value as ReportRangePreset });
          }}
        >
          <option value="today">Hoy</option>
          <option value="7d">Ultimos 7 dias</option>
          <option value="30d">Ultimos 30 dias</option>
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
    </div>
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
      <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
        {label}
      </span>
      <span className="relative block">
        <CalendarDays
          className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"
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
