import { Alert } from "@/components/ui/Alert";
import { formatCurrency } from "@/lib/format/currency";
import type { StoreDayCloseReportResult } from "../types";

export function StoreDayCloseReportView({ report }: { report: StoreDayCloseReportResult }) {
  if (!report.ok) {
    return <Alert variant="error">No se pudo cargar el reporte de cierre: {report.error.message}</Alert>;
  }

  const data = report.data;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Ventas" value={formatCurrency(data.sales_total)} />
        <Metric label="Efectivo esperado" value={formatCurrency(data.expected_cash_amount)} />
        <Metric label="Efectivo contado" value={data.counted_cash_amount ? formatCurrency(data.counted_cash_amount) : "Sin conteo"} />
        <Metric label="Diferencia" value={data.cash_difference_amount ? formatCurrency(data.cash_difference_amount) : "No calculada"} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-950">Detalle de jornada</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <Item label="Fecha operativa" value={formatBusinessDate(data.business_date)} />
          <Item label="Cerrada" value={formatDateTime(data.closed_at)} />
          <Item label="Snapshot" value={formatDateTime(data.closing_snapshot_at)} />
          <Item label="Ventas completadas" value={data.sales_count.toString()} />
          <Item label="Ventas anuladas" value={data.voided_sales_count.toString()} />
          <Item label="Items vendidos" value={data.items_count.toString()} />
          <Item label="Caja inicial" value={formatCurrency(data.opening_cash_amount)} />
          <Item label="Efectivo" value={formatCurrency(data.cash_sales_total)} />
          <Item label="QR" value={formatCurrency(data.qr_sales_total)} />
          <Item label="Transferencia" value={formatCurrency(data.transfer_sales_total)} />
          <Item label="Tarjeta" value={formatCurrency(data.card_sales_total)} />
          <Item label="Nota" value={data.closing_note ?? "Sin nota"} />
        </dl>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
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

function formatBusinessDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
