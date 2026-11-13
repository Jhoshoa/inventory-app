import { formatCurrency } from "@/lib/format/currency";
import type { StoreDayCloseReport } from "@/features/store-day/types";
import { closingDifference, nonCashSales } from "../closings";
import { DifferenceTag } from "./DifferenceTag";

/**
 * El cierre en cuentas (tablero P08): caja inicial + ventas en efectivo + entradas −
 * salidas = esperado; contado y diferencia; lo cobrado por QR / transferencia / tarjeta,
 * ventas · anuladas · artículos, y la nota.
 */
export function ClosingBreakdown({ report, closedBy }: { report: StoreDayCloseReport; closedBy?: string | null }) {
  const difference = closingDifference(report);
  return (
    <div className="flex flex-col gap-3 text-sm">
      <dl className="flex flex-col gap-1.5">
        <Row label="Caja inicial" value={formatCurrency(report.opening_cash_amount)} />
        <Row label="+ Ventas en efectivo" value={formatCurrency(report.cash_sales_total)} />
        <Row label="+ Entradas" value={formatCurrency(report.cash_movements_in_total)} />
        <Row label="− Salidas" value={formatCurrency(report.cash_movements_out_total)} />
        <div className="flex items-baseline justify-between gap-3 border-t border-app-border pt-1.5 font-bold text-text-strong">
          <dt>= Efectivo esperado</dt>
          <dd className="tabular-nums">{formatCurrency(report.expected_cash_amount)}</dd>
        </div>
        <Row label="Contado" value={report.counted_cash_amount === null ? "Sin conteo" : formatCurrency(report.counted_cash_amount)} />
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-muted">Diferencia</dt>
          <dd>
            <DifferenceTag kind={difference.kind} amount={difference.amount} />
          </dd>
        </div>
      </dl>
      <dl className="flex flex-col gap-1.5 border-t border-dashed border-app-borderStrong pt-3">
        <Row label="QR · Transferencia · Tarjeta" value={formatCurrency(nonCashSales(report))} />
        <Row label="Ventas · anuladas · artículos" value={`${report.sales_count} · ${report.voided_sales_count} · ${report.items_count}`} />
        {closedBy ? <Row label="Cerró" value={closedBy} /> : null}
      </dl>
      {report.closing_note ? (
        <p className="rounded-control bg-app-surface-muted px-3 py-2 text-text-body">
          <span className="font-semibold text-text-strong">Nota:</span> &ldquo;{report.closing_note}&rdquo;
        </p>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right font-semibold tabular-nums text-text-strong">{value}</dd>
    </div>
  );
}
