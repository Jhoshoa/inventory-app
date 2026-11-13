"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogTitle } from "@/components/ui/Dialog";
import { formatCurrency } from "@/lib/format/currency";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { StoreDayCloseReport } from "@/features/store-day/types";
import { closingDay, closingDifference, closingHours } from "../closings";
import { ClosingBreakdown } from "./ClosingBreakdown";
import { DifferenceTag } from "./DifferenceTag";

/**
 * Cierres de caja (tablero P08, dueño). Celular: tarjetas que abren la página del cierre.
 * Desde 768 px: tabla Día · Vendido · Esperado · Contado · Diferencia; la fila abre el
 * resumen al costado (desde 1280 px) o en una ventana lateral.
 */
export function ClosingsBrowser({ reports, names }: { reports: StoreDayCloseReport[]; names: Record<string, string> }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const wide = useMediaQuery("(min-width: 1280px)");
  const selected = reports.find((report) => report.business_day_id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId || !wide) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.querySelector("[role='dialog']")) setSelectedId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId, wide]);

  const detail = selected ? (
    <>
      <ClosingBreakdown report={selected} closedBy={names[selected.closed_by_user_id] ?? null} />
      <Button asChild variant="secondary" className="mt-3 w-full">
        <Link href={`/dashboard/reports/store-days/${selected.business_day_id}`}>Ver página del cierre</Link>
      </Button>
    </>
  ) : null;

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)] items-start gap-4 ${selected && wide ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
      <div className="min-w-0">
        <ul className="flex flex-col gap-2 md:hidden">
          {reports.map((report) => {
            const difference = closingDifference(report);
            return (
              <li key={report.business_day_id}>
                <Link
                  href={`/dashboard/reports/store-days/${report.business_day_id}`}
                  className="flex items-center justify-between gap-3 rounded-card border border-app-border bg-app-surface px-3.5 py-3 hover:bg-app-surface-muted"
                >
                  <span className="min-w-0">
                    <strong className="block text-[15px] text-text-strong">{closingDay(report.business_date)}</strong>
                    <span className="text-xs text-text-muted">
                      {closingHours(report)} · vendido {formatCurrency(report.sales_total)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <DifferenceTag kind={difference.kind} amount={difference.amount} />
                    <ChevronRight className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="overflow-hidden rounded-card border border-app-border bg-app-surface max-md:hidden">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-app-surface-muted text-left text-xs font-semibold text-text-muted">
              <tr>
                <th scope="col" className="px-3 py-2.5">Día</th>
                <th scope="col" className="w-[112px] px-3 py-2.5 text-right">Vendido</th>
                <th scope="col" className={`w-[112px] px-3 py-2.5 text-right ${selected && wide ? "hidden" : ""}`}>Esperado</th>
                <th scope="col" className={`w-[112px] px-3 py-2.5 text-right ${selected && wide ? "hidden" : ""}`}>Contado</th>
                <th scope="col" className="w-[136px] px-3 py-2.5">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {reports.map((report) => {
                const difference = closingDifference(report);
                const isSelected = report.business_day_id === selectedId;
                const toggle = () => setSelectedId((current) => (current === report.business_day_id ? null : report.business_day_id));
                return (
                  <tr key={report.business_day_id} onClick={toggle} className={`cursor-pointer ${isSelected ? "bg-brand-50" : "hover:bg-app-surface-muted"}`}>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        aria-current={isSelected ? "true" : undefined}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggle();
                        }}
                        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <strong className="block text-text-strong">{closingDay(report.business_date)}</strong>
                        <span className="text-xs text-text-muted">{closingHours(report)}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums text-text-strong">{formatCurrency(report.sales_total)}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums text-text-body ${selected && wide ? "hidden" : ""}`}>
                      {formatCurrency(report.expected_cash_amount)}
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums text-text-body ${selected && wide ? "hidden" : ""}`}>
                      {report.counted_cash_amount === null ? "—" : formatCurrency(report.counted_cash_amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <DifferenceTag kind={difference.kind} amount={difference.amount} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && wide ? (
        <aside aria-label="Resumen del cierre" className="sticky top-4 flex flex-col gap-3 rounded-card border border-app-border bg-app-surface p-[18px]">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-[17px] font-extrabold text-text-strong">{closingDay(selected.business_date, true)}</h2>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Cerrar resumen"
              className="-mr-2 -mt-1 flex h-10 w-10 items-center justify-center rounded-control text-text-muted hover:bg-app-surface-muted hover:text-text-strong"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {detail}
        </aside>
      ) : null}

      {selected && !wide ? (
        <Dialog open onOpenChange={(open) => !open && setSelectedId(null)} position="right" className="!max-w-[400px]">
          <DialogTitle close>{closingDay(selected.business_date, true)}</DialogTitle>
          <DialogBody className="pb-5">{detail}</DialogBody>
        </Dialog>
      ) : null}
    </div>
  );
}
