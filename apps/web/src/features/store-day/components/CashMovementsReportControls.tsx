"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { buildExportDateTimeQuery } from "@/features/reports/schemas";
import type { CashMovementType } from "../types";

export interface CashMovementsReportParams {
  from_date?: string;
  to_date?: string;
  type: CashMovementType | "all" | string;
}

export function CashMovementsReportControls({ params }: { params: CashMovementsReportParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const exportQuery = buildCashMovementsExportQuery(params);

  const updateParam = useCallback((name: string, value: string | null) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(name, value);
    else next.delete(name);
    next.set("offset", "0");

    startTransition(() => {
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }, [pathname, router]);

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[160px_160px_180px_1fr]">
      <DateField label="Desde" value={params.from_date ?? ""} onChange={(value) => updateParam("from_date", value || null)} />
      <DateField label="Hasta" value={params.to_date ?? ""} onChange={(value) => updateParam("to_date", value || null)} />
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase text-slate-500">Tipo</span>
        <Select
          aria-label="Tipo de movimiento de caja"
          value={params.type}
          onChange={(event) => updateParam("type", event.target.value)}
        >
          <option value="all">Todos</option>
          <option value="cash_in">Entrada</option>
          <option value="cash_out">Salida</option>
          <option value="expense">Gasto</option>
          <option value="deposit">Deposito</option>
          <option value="withdrawal">Retiro</option>
        </Select>
      </label>
      <div className="flex items-end md:justify-end">
        <Button variant="secondary" asChild>
          <a href={`/api/exports/cash-movements${exportQuery ? `?${exportQuery}` : ""}`}>
            <Download className="h-4 w-4" aria-hidden />
            Exportar CSV
          </a>
        </Button>
      </div>
    </div>
  );
}

export function buildCashMovementsExportQuery(params: CashMovementsReportParams) {
  const query = new URLSearchParams(
    params.from_date && params.to_date
      ? buildExportDateTimeQuery({ from: params.from_date, to: params.to_date })
      : "",
  );
  if (params.from_date && !params.to_date) query.set("from", `${params.from_date}T00:00:00.000Z`);
  if (params.to_date && !params.from_date) query.set("to", `${params.to_date}T23:59:59.999Z`);
  if (params.type && params.type !== "all") query.set("type", params.type);
  return query.toString();
}

function DateField({
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
      <span className="mb-1 block text-xs font-medium uppercase text-slate-500">{label}</span>
      <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
