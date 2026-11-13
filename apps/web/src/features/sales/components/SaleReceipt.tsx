import { formatPhone } from "@/lib/format/phone";
import { paymentLabel, saleDateTime, shortSaleId } from "../list";
import { discountLabel } from "../schemas";
import type { Sale } from "../types";

export interface ReceiptStoreInfo {
  name: string;
  address?: string | null;
  phone?: string | null;
  nit?: string | null;
  /** Logo de la tienda (el del catálogo); arriba del nombre si hay. */
  logoUrl?: string | null;
}

const amountFormatter = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function amount(value: string | number) {
  return amountFormatter.format(Number(value) || 0);
}

/**
 * Ticket de 80 mm (tablero P06 · Recibo): el mismo en la ventana y en la página de
 * impresión. Montos sin "Bs" salvo el total, como un ticket de caja.
 */
export function SaleReceipt({ sale, store }: { sale: Sale; store: ReceiptStoreInfo }) {
  const contact = [store.address, store.phone ? `Tel ${formatPhone(store.phone)}` : null].filter(Boolean).join(" · ");
  const discount = Number(sale.discount_amount);

  return (
    <div
      className="receipt-print-area mx-auto w-full max-w-[302px] bg-white px-4 py-5 font-mono text-xs leading-relaxed text-[#101828] shadow-panel print:max-w-none print:p-0 print:shadow-none"
      aria-label="Recibo"
    >
      {store.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagen de Cloudinary en un ticket para imprimir
        <img src={store.logoUrl} alt="" className="mx-auto mb-1 h-12 w-auto max-w-[160px] object-contain grayscale" />
      ) : null}
      <p className="text-center text-sm font-bold uppercase">{store.name}</p>
      {contact ? <p className="text-center">{contact}</p> : null}
      {store.nit ? <p className="text-center">NIT {store.nit}</p> : null}
      <Rule />
      <p>Venta {shortSaleId(sale.id)}</p>
      <p>
        {saleDateTime(sale.created_at)} · {paymentLabel(sale.payment_method)}
      </p>
      {sale.customer_name ? <p>Cliente: {sale.customer_name}</p> : null}
      <Rule />
      <ul>
        {sale.items.map((item) => (
          <li key={item.product_id} className="flex justify-between gap-3">
            <span className="min-w-0 break-words">
              {item.quantity} × {item.product_name}
            </span>
            <span className="shrink-0 tabular-nums">{amount(item.subtotal)}</span>
          </li>
        ))}
      </ul>
      <Rule />
      {discount > 0 ? (
        <>
          <Line label="Subtotal" value={amount(sale.subtotal)} />
          <Line label={sale.discount_type === "product" ? "Desc. producto" : discountLabel(sale)} value={`-${amount(discount)}`} />
        </>
      ) : null}
      <div className="flex justify-between text-sm font-bold">
        <span>TOTAL Bs</span>
        <span className="tabular-nums">{amount(sale.total)}</span>
      </div>
      {sale.status === "voided" ? <p className="mt-2 border border-[#101828] py-0.5 text-center font-bold">VENTA ANULADA</p> : null}
      <Rule />
      <p className="text-center">Comprobante de venta · no es factura</p>
      <p className="text-center">¡Gracias por tu compra!</p>
    </div>
  );
}

function Rule() {
  return <div className="my-2 border-t border-dashed border-[#101828]" aria-hidden="true" />;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
