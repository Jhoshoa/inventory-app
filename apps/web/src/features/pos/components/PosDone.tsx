"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, CheckCircle2, CloudOff, MessageCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format/currency";
import { formatTimeShort } from "@/lib/format/datetime";
import { updateStorefrontRequestStatusAction } from "@/features/storefront-requests/actions";
import { PAYMENT_METHOD_LABEL, isPaymentMethod, receiptText } from "../schemas";
import type { FinishedSale } from "./PosCheckout";

/**
 * "Venta registrada" (tablero A · Venta lista): total, recibido y cambio, Imprimir,
 * WhatsApp y Nueva venta, en lugar de saltar al detalle de la venta. Sin conexión
 * avisa que la venta quedó en el equipo y el recibo se imprime cuando se envíe.
 */
export function PosDone({
  finished,
  storeName,
  sellerName,
  order = null,
  onNewSale,
}: {
  finished: FinishedSale;
  storeName: string;
  sellerName: string | null;
  /** Pedido del catálogo que se cobró: se ofrece cerrarlo. */
  order?: { id: string; customerName: string } | null;
  onNewSale: () => void;
}) {
  const [orderState, setOrderState] = useState<"open" | "closing" | "closed">("open");
  const online = finished.kind === "online";
  const total = online ? Number(finished.sale.total) : finished.total;
  const method = online ? finished.sale.payment_method : finished.paymentMethod;
  const methodLabel = isPaymentMethod(method) ? PAYMENT_METHOD_LABEL[method] : method;
  const createdAt = online ? finished.sale.created_at : finished.createdAt;
  const saleId = online ? finished.sale.id : finished.id;
  const seller = (online ? finished.sale.created_by_name : null) ?? sellerName;
  const time = formatTimeShort(createdAt);
  const receivedAmount = finished.received.trim() ? Number(finished.received.replace(",", ".")) : null;

  async function closeOrder() {
    if (!order || orderState !== "open") return;
    setOrderState("closing");
    try {
      const result = await updateStorefrontRequestStatusAction(order.id, "closed");
      if (result.ok) {
        setOrderState("closed");
        toast.success("Pedido cerrado");
      } else {
        setOrderState("open");
        toast.error(result.message || "No se pudo cerrar el pedido");
      }
    } catch {
      setOrderState("open");
      toast.error("No se pudo cerrar el pedido. Ciérralo desde Pedidos.");
    }
  }

  // Listo para la siguiente: Enter en "Nueva venta".
  useEffect(() => document.getElementById("pos-new-sale")?.focus(), []);

  const whatsappText = receiptText({
    storeName,
    when: `${time} · venta ${saleId.slice(0, 8)}`,
    items: finished.items.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      amount: Number(item.product.effective_price) * item.quantity,
    })),
    total,
    paymentLabel: methodLabel,
  });

  return (
    <section aria-labelledby="pos-done-title" className="flex flex-col gap-4">
      <div role="status" className="flex flex-col items-center gap-2 pt-2 text-center">
        {online ? (
          <CheckCircle2 className="h-12 w-12 text-status-success" aria-hidden="true" />
        ) : (
          <CloudOff className="h-12 w-12 text-status-warning" aria-hidden="true" />
        )}
        <h2 id="pos-done-title" className="text-xl font-extrabold text-text-strong">
          {online ? "Venta registrada" : "Venta guardada en este equipo"}
        </h2>
        <p className="text-sm text-text-muted">
          {online ? `Venta ${saleId.slice(0, 8)} · ${time} · ${methodLabel}${seller ? ` · ${seller}` : ""}` : "Se enviará al volver internet."}
        </p>
      </div>

      <dl className="space-y-1.5 rounded-card bg-app-surface-muted px-4 py-3">
        <div className="flex items-baseline justify-between">
          <dt className="text-sm text-text-muted">Total</dt>
          <dd className="text-2xl font-extrabold tabular-nums text-text-strong">{formatCurrency(total)}</dd>
        </div>
        {receivedAmount !== null ? (
          <>
            <div className="flex justify-between text-sm">
              <dt className="text-text-muted">Recibido</dt>
              <dd className="tabular-nums text-text-body">{formatCurrency(receivedAmount)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-app-border pt-1.5">
              <dt className="font-bold text-text-strong">Dar de cambio</dt>
              <dd className="text-xl font-extrabold tabular-nums text-text-strong">{formatCurrency(finished.change)}</dd>
            </div>
          </>
        ) : null}
      </dl>

      <div className="grid grid-cols-2 gap-2">
        {online ? (
          <Button variant="secondary" asChild>
            <Link href={`/dashboard/sales/${saleId}/print`} target="_blank" rel="noopener">
              <Printer className="h-4 w-4" aria-hidden="true" />
              Imprimir recibo
            </Link>
          </Button>
        ) : (
          <Button variant="secondary" disabled title="Se puede imprimir cuando la venta se envíe">
            <Printer className="h-4 w-4" aria-hidden="true" />
            Imprimir al enviar
          </Button>
        )}
        <Button variant="secondary" asChild>
          <a href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Enviar por WhatsApp
          </a>
        </Button>
      </div>
      {online ? (
        <Link href={`/dashboard/sales/${saleId}`} className="text-center text-sm font-bold text-brand-700 hover:underline">
          Ver detalle de la venta
        </Link>
      ) : null}
      {order ? (
        <div className="flex items-center justify-between gap-3 rounded-card border border-app-border px-3.5 py-2.5 text-sm">
          <span className="min-w-0 text-text-body">
            Pedido de <strong className="text-text-strong">{order.customerName}</strong>
          </span>
          {orderState === "closed" ? (
            <span className="inline-flex shrink-0 items-center gap-1 font-bold text-status-success">
              <Check className="h-4 w-4" aria-hidden="true" />
              Cerrado
            </span>
          ) : online ? (
            <Button variant="secondary" className="!h-9 shrink-0 px-3" disabled={orderState === "closing"} onClick={() => void closeOrder()}>
              {orderState === "closing" ? "Cerrando…" : "Cerrar pedido"}
            </Button>
          ) : (
            <span className="shrink-0 text-xs text-text-muted">Ciérralo en Pedidos al volver internet</span>
          )}
        </div>
      ) : null}
      <Button id="pos-new-sale" className="!h-[52px] text-base" onClick={onNewSale}>
        Nueva venta
      </Button>
    </section>
  );
}
