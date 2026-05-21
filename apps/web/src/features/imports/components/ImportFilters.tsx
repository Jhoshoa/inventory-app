"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import type { ImportSearchParams } from "../types";

export function ImportFilters({ params }: { params: ImportSearchParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const updateStatus = useCallback((status: string) => {
    const next = new URLSearchParams(window.location.search);
    if (status === "all") next.delete("status");
    else next.set("status", status);
    next.set("offset", "0");

    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`);
    });
  }, [pathname, router]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <label className="block max-w-xs">
        <span className="mb-1 block text-xs font-medium uppercase text-slate-500">
          Estado
        </span>
        <Select
          aria-label="Estado de Import Image"
          value={params.status}
          onChange={(event) => updateStatus(event.target.value)}
        >
          <option value="all">Todos</option>
          <option value="needs_review">En revision</option>
          <option value="confirmed">Confirmadas</option>
          <option value="failed">Fallidas</option>
          <option value="cancelled">Canceladas</option>
          <option value="processing">Procesando</option>
          <option value="pending">Pendientes</option>
        </Select>
      </label>
    </div>
  );
}
