import { formatCurrency } from "@/lib/format/currency";
import { paymentLabel, saleSourceLabel, saleWhen } from "../list";
import { discountLabel } from "../schemas";
import type { Sale } from "../types";

const amountFormatter = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function amount(value: string | number) {
  return amountFormatter.format(Number(value) || 0);
}

/** Productos de la venta: "Coca Cola 2l × 2 · 14,00 … 28,00" (página) o sin precio unitario (panel). */
export function SaleLines({ sale, compact = false }: { sale: Sale; compact?: boolean }) {
  if (sale.items.length === 0) return <p className="text-sm text-text-muted">Sin productos</p>;
  return (
    <ul className="divide-y divide-app-border">
      {sale.items.map((item) => (
        <li key={item.product_id} className="flex items-start justify-between gap-3 py-2 text-sm first:pt-0">
          <span className={`min-w-0 break-words text-text-strong ${sale.status === "voided" ? "line-through decoration-text-muted" : ""}`}>
            {item.product_name}{" "}
            <span className="whitespace-nowrap text-text-muted">
              × {item.quantity}
              {compact ? "" : ` · ${amount(item.unit_price)}`}
            </span>
          </span>
          <strong className="shrink-0 tabular-nums text-text-strong">{amount(item.subtotal)}</strong>
        </li>
      ))}
    </ul>
  );
}

/** Subtotal, descuento y total; en el panel el total lleva el pago ("Total · Efectivo"). */
export function SaleTotals({ sale, withPayment = false }: { sale: Sale; withPayment?: boolean }) {
  const discount = Number(sale.discount_amount);
  return (
    <dl className="space-y-1 border-t border-dashed border-app-borderStrong pt-2 text-sm">
      {discount > 0 ? (
        <>
          <div className="flex justify-between text-text-muted">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatCurrency(sale.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-status-success">
            <dt>{discountLabel(sale)}</dt>
            <dd className="tabular-nums">− {formatCurrency(discount)}</dd>
          </div>
        </>
      ) : null}
      <div className="flex items-baseline justify-between text-lg font-extrabold text-text-strong">
        <dt>Total{withPayment ? ` · ${paymentLabel(sale.payment_method)}` : ""}</dt>
        <dd className={`tabular-nums ${sale.status === "voided" ? "line-through decoration-2" : ""}`}>{formatCurrency(sale.total)}</dd>
      </div>
    </dl>
  );
}

/** Pago, cliente y cómo se registró (en línea o sin conexión). */
export function SaleFacts({ sale }: { sale: Sale }) {
  const rows = [
    ["Pago", paymentLabel(sale.payment_method)],
    ["Cliente", sale.customer_name?.trim() || "—"],
    ["Registrada", saleSourceLabel(sale.device_id)],
  ];
  return (
    <dl className="space-y-1.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-text-muted">{label}</dt>
          <dd className="text-right font-bold text-text-strong">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Venta anulada: cuándo, quién y la razón (en lugar del botón Anular). */
export function SaleVoidedNote({ sale, today }: { sale: Sale; today: string }) {
  if (sale.status !== "voided") return null;
  const who = sale.voided_by_name ? ` por ${sale.voided_by_name}` : "";
  return (
    <div className="rounded-card border border-status-dangerBorder bg-status-dangerBg px-4 py-3 text-sm">
      <p className="font-bold text-status-danger">
        Anulada{sale.voided_at ? ` ${saleWhen(sale.voided_at, today).replace(/^(Hoy|Ayer)/, (day) => day.toLowerCase())}` : ""}
        {who}
      </p>
      <p className="mt-0.5 text-text-body">Razón: {sale.void_reason?.trim() || "Sin razón registrada"}</p>
    </div>
  );
}

/** "Hoy 11:47 · Luis" (más "· En línea" en el panel). */
export function saleSubtitle(sale: Sale, today: string, withSource = false) {
  return [saleWhen(sale.created_at, today), sale.created_by_name, withSource ? saleSourceLabel(sale.device_id) : null]
    .filter(Boolean)
    .join(" · ");
}
