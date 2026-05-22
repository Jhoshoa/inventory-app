import { formatCurrency } from "@/lib/format/currency";
import type { StoreDayClosingPreviewResult } from "../types";

export function StoreDayClosingPreview({ preview }: { preview?: StoreDayClosingPreviewResult }) {
  if (!preview || !preview.ok) return null;
  const data = preview.data;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-950">Preview de cierre</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <Item label="Caja inicial" value={formatCurrency(data.opening_cash_amount)} />
        <Item label="Efectivo esperado" value={formatCurrency(data.expected_cash_amount)} />
        <Item label="Ventas totales" value={formatCurrency(data.sales_total)} />
        <Item label="Ventas completadas" value={data.sales_count.toString()} />
        <Item label="Efectivo" value={formatCurrency(data.cash_sales_total)} />
        <Item label="Entradas caja" value={formatCurrency(data.cash_movements_in_total)} />
        <Item label="Salidas caja" value={formatCurrency(data.cash_movements_out_total)} />
        <Item label="QR" value={formatCurrency(data.qr_sales_total)} />
        <Item label="Transferencia" value={formatCurrency(data.transfer_sales_total)} />
        <Item label="Tarjeta" value={formatCurrency(data.card_sales_total)} />
      </dl>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-950">{value}</dd>
    </div>
  );
}
