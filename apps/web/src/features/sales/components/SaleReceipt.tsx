import { formatCurrency } from "@/lib/format/currency";
import { formatDateTimeShort } from "@/lib/format/datetime";
import { discountLabel } from "../schemas";
import type { Sale } from "../types";

export interface ReceiptStoreInfo {
  name: string;
  address?: string | null;
  phone?: string | null;
  nit?: string | null;
}

export function SaleReceipt({ sale, store }: { sale: Sale; store: ReceiptStoreInfo }) {
  return (
    <div className="receipt-print-area mx-auto w-full max-w-md space-y-4 rounded-lg border border-app-border bg-app-surface p-6 text-sm text-text-body">
      <div className="space-y-1 text-center">
        <p className="text-lg font-semibold text-text-strong">{store.name}</p>
        {store.address ? <p className="text-xs text-text-muted">{store.address}</p> : null}
        {store.phone ? <p className="text-xs text-text-muted">Tel: {store.phone}</p> : null}
        {store.nit ? <p className="text-xs text-text-muted">NIT: {store.nit}</p> : null}
      </div>

      <div className="space-y-1 border-t border-dashed border-app-border pt-3 text-xs">
        <div className="flex justify-between">
          <span className="text-text-muted">Comprobante</span>
          <span className="font-mono font-medium text-text-strong">{sale.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Fecha</span>
          <span>{formatDateTimeShort(sale.created_at)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Pago</span>
          <span className="capitalize">{sale.payment_method}</span>
        </div>
      </div>

      <table className="w-full border-t border-dashed border-app-border pt-2 text-xs">
        <thead>
          <tr className="text-left text-text-muted">
            <th className="pb-1 font-normal">Producto</th>
            <th className="pb-1 text-right font-normal">Cant.</th>
            <th className="pb-1 text-right font-normal">P. Unit.</th>
            <th className="pb-1 text-right font-normal">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.product_id}>
              <td className="py-0.5 text-text-strong">{item.product_name}</td>
              <td className="py-0.5 text-right">{item.quantity}</td>
              <td className="py-0.5 text-right">{formatCurrency(item.unit_price)}</td>
              <td className="py-0.5 text-right font-medium text-text-strong">{formatCurrency(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1 border-t border-dashed border-app-border pt-2">
        <div className="flex justify-between text-text-muted">
          <span>Subtotal</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        {Number(sale.discount_amount) > 0 ? (
          <div className="flex justify-between text-status-success">
            <span>{discountLabel(sale)}</span>
            <span>-{formatCurrency(sale.discount_amount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between border-t border-app-border pt-1 text-base font-semibold text-text-strong">
          <span>Total</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>
      </div>

      {sale.status === "voided" ? (
        <p className="rounded-md bg-status-dangerBg py-1 text-center text-xs font-semibold uppercase text-status-danger">
          Venta anulada
        </p>
      ) : null}

      <p className="pt-2 text-center text-[11px] text-text-muted">
        Comprobante interno de venta. No tiene validez como factura fiscal.
      </p>
    </div>
  );
}
