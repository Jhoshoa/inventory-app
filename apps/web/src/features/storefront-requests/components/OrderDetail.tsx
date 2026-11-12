"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircle, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format/currency";
import { formatPhone } from "@/lib/format/phone";
import { saveOrderForPos } from "@/features/pos/order";
import { storefrontWhatsappHref } from "@/features/storefront/whatsapp";
import { updateStorefrontRequestPaymentAction, updateStorefrontRequestStatusAction } from "../actions";
import { DELIVERY_LABEL, STATUS_LABEL, STATUS_ORDER, customerWhatsappMessage, receivedAt, toPosOrder } from "../list";
import type { StorefrontRequestResponse, StorefrontRequestStatus } from "../types";
import { OrderStatusBadge } from "./OrderBadges";

/**
 * Detalle del pedido (tablero P07): productos y total, entrega y nota, WhatsApp con el
 * pedido armado (al volver sugiere "Contactado"), estado, pago recibido y Cobrar en Vender.
 */
export function OrderDetail({
  request,
  storeName,
  now,
  onUpdated,
}: {
  request: StorefrontRequestResponse;
  storeName: string;
  now: number;
  onUpdated: (request: StorefrontRequestResponse, previous: StorefrontRequestResponse) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"status" | "payment" | null>(null);
  const [suggestContacted, setSuggestContacted] = useState(false);
  const canCharge = request.status !== "closed" && toPosOrder(request).items.some((item) => item.productId);

  async function changeStatus(status: StorefrontRequestStatus) {
    if (busy || status === request.status) return;
    setBusy("status");
    try {
      const result = await updateStorefrontRequestStatusAction(request.id, status);
      if (result.ok && result.request) {
        toast.success(result.message);
        setSuggestContacted(false);
        onUpdated(result.request, request);
      } else {
        toast.error(result.message || "No se pudo cambiar el estado");
      }
    } catch {
      toast.error("No se pudo cambiar el estado. Revisa tu conexión.");
    } finally {
      setBusy(null);
    }
  }

  async function togglePayment() {
    if (busy) return;
    setBusy("payment");
    try {
      const result = await updateStorefrontRequestPaymentAction(request.id, !request.payment_confirmed);
      if (result.ok && result.request) {
        toast.success(result.message);
        onUpdated(result.request, request);
      } else {
        toast.error(result.message || "No se pudo guardar el pago");
      }
    } catch {
      toast.error("No se pudo guardar el pago. Revisa tu conexión.");
    } finally {
      setBusy(null);
    }
  }

  function chargeInPos() {
    if (!saveOrderForPos(toPosOrder(request))) {
      toast.error("Este navegador no deja pasar el pedido a Vender. Agrega los productos a mano.");
      return;
    }
    router.push(`/dashboard/pos?pedido=${encodeURIComponent(request.id)}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] text-text-muted">
          {formatPhone(request.customer_phone)} · {receivedAt(request.created_at, now)}
        </p>
        <OrderStatusBadge status={request.status} className="shrink-0" />
      </div>

      {request.items.length > 0 ? (
        <div className="flex flex-col gap-2">
          <ul className="divide-y divide-app-border">
            {request.items.map((item, index) => (
              <li key={`${item.product_id ?? item.product_name}-${index}`} className="flex items-start justify-between gap-3 py-2 text-sm first:pt-0">
                <span className="min-w-0 break-words text-text-strong">
                  {item.product_name} <span className="whitespace-nowrap text-text-muted">× {item.quantity}</span>
                </span>
                <strong className="shrink-0 tabular-nums text-text-strong">{formatCurrency(item.line_total)}</strong>
              </li>
            ))}
          </ul>
          {request.total ? (
            <div className="flex items-baseline justify-between border-t border-dashed border-app-borderStrong pt-2 text-lg font-extrabold text-text-strong">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(request.total)}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-text-strong">
          Consulta por <strong>{request.product_name}</strong>
        </p>
      )}

      {request.delivery_method || request.note ? (
        <div className="space-y-1 rounded-card bg-app-surface-muted px-3 py-2.5 text-sm">
          {request.delivery_method ? <p className="font-bold text-text-strong">{DELIVERY_LABEL[request.delivery_method]}</p> : null}
          {request.note ? <p className="break-words text-text-body">Nota: &ldquo;{request.note}&rdquo;</p> : null}
        </div>
      ) : null}

      <a
        href={storefrontWhatsappHref(request.customer_phone, customerWhatsappMessage(request, storeName))}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => request.status === "pending" && setSuggestContacted(true)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-[#128C4A] px-4 text-sm font-bold text-white hover:bg-[#0E7A40] focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
      >
        <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        Escribir por WhatsApp
      </a>
      {suggestContacted && request.status === "pending" ? (
        <div role="status" className="flex items-center justify-between gap-2 rounded-card border border-status-infoBorder bg-status-infoBg px-3 py-2 text-sm text-status-info">
          <span>¿Ya le escribiste?</span>
          <Button variant="secondary" className="!h-9 shrink-0 px-3" disabled={busy !== null} onClick={() => void changeStatus("contacted")}>
            Marcar como contactado
          </Button>
        </div>
      ) : null}

      <div>
        <p id={`order-status-${request.id}`} className="mb-1.5 text-sm font-semibold text-text-body">
          Estado
        </p>
        <div role="radiogroup" aria-labelledby={`order-status-${request.id}`} className="grid grid-cols-3 gap-1 rounded-control bg-app-surface-muted p-1">
          {STATUS_ORDER.map((status) => {
            const checked = request.status === status;
            return (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={checked}
                disabled={busy !== null}
                onClick={() => void changeStatus(status)}
                className={`h-9 rounded-[10px] text-[13px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-wait ${
                  checked ? "bg-app-surface text-text-strong shadow-sm" : "text-text-muted hover:text-text-strong"
                }`}
              >
                {STATUS_LABEL[status]}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-control border border-app-border px-3">
        <span className="text-sm font-semibold text-text-strong">Pago recibido</span>
        <input
          type="checkbox"
          role="switch"
          checked={request.payment_confirmed}
          disabled={busy !== null}
          onChange={() => void togglePayment()}
          className="h-5 w-5 accent-brand-700"
        />
      </label>

      {canCharge ? (
        <Button className="!h-12 text-base" onClick={chargeInPos}>
          <ShoppingCart className="h-5 w-5 shrink-0" aria-hidden="true" />
          Cobrar en Vender
        </Button>
      ) : null}
    </div>
  );
}
