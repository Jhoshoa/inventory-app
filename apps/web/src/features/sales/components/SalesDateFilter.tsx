"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
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
    next.set("limit", params.limit.toString());

    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }, [params.limit, pathname, router]);

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1fr_180px]">
      <DateInput
        label="Desde"
        value={params.from_date}
        min={firstBusinessDate}
        onChange={(value) => updateParams({ from_date: value })}
      />
      <DateInput
        label="Hasta"
        value={params.to_date}
        min={firstBusinessDate}
        onChange={(value) => updateParams({ to_date: value })}
      />
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
          Estado
        </span>
        <Select
          aria-label="Estado de venta"
          value={params.status}
          onChange={(event) => updateParams({ status: event.target.value })}
        >
          <option value="all">Todas</option>
          <option value="completed">Completadas</option>
          <option value="voided">Anuladas</option>
        </Select>
      </label>
    </div>
  );
}

function DateInput({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: string;
  min: string | null;
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
          min={min ?? undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}
