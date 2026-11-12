"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CheckCircle2, CloudOff, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format/currency";
import { formatTimeShort } from "@/lib/format/datetime";
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
  onNewSale,
}: {
  finished: FinishedSale;
  storeName: string;
  sellerName: string | null;
  onNewSale: () => void;
}) {
  const online = finished.kind === "online";
  const total = online ? Number(finished.sale.total) : finished.total;
  const method = online ? finished.sale.payment_method : finished.paymentMethod;
  const methodLabel = isPaymentMethod(method) ? PAYMENT_METHOD_LABEL[method] : method;
  const createdAt = online ? finished.sale.created_at : finished.createdAt;
  const saleId = online ? finished.sale.id : finished.id;
  const seller = (online ? finished.sale.created_by_name : null) ?? sellerName;
  const time = formatTimeShort(createdAt);
  const receivedAmount = finished.received.trim() ? Number(finished.received.replace(",", ".")) : null;

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
      <Button id="pos-new-sale" className="!h-[52px] text-base" onClick={onNewSale}>
        Nueva venta
      </Button>
    </section>
  );
}
