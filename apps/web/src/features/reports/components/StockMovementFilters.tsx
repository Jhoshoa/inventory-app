"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { StockMovementSearchParams } from "../types";

export function StockMovementFilters({ params }: { params: StockMovementSearchParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const updateParam = useCallback((name: string, value: string | null) => {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name === "from" || name === "to") next.set("range", "custom");
    next.set("offset", "0");

    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }, [pathname, router]);

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[160px_160px_160px_1fr]">
      <DateField label="Desde" value={params.from} onChange={(value) => updateParam("from", value)} />
      <DateField label="Hasta" value={params.to} onChange={(value) => updateParam("to", value)} />
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
          Tipo
        </span>
        <Select
          aria-label="Tipo de movimiento"
          value={params.type}
          onChange={(event) => updateParam("type", event.target.value)}
        >
          <option value="all">Todos</option>
          <option value="sale">Venta</option>
          <option value="sale_void">Anulacion</option>
          <option value="manual_adjustment">Ajuste manual</option>
          <option value="import">Importacion</option>
          <option value="stock_movement">Movimiento</option>
        </Select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
          Producto ID
        </span>
        <Input
          placeholder="Filtrar por producto"
          defaultValue={params.product_id ?? ""}
          onBlur={(event) => updateParam("product_id", event.target.value.trim() || null)}
        />
      </label>
    </div>
  );
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
      <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
        {label}
      </span>
      <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
