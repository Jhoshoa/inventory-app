"use client";

import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { PhoneCountryInput } from "@/components/ui/PhoneCountryInput";
import { formatCurrency } from "@/lib/format/currency";
import { MAX_LINE_QUANTITY, useBoleta } from "../boleta";
import { createStorefrontOrderAction } from "../requestActions";
import type { StorefrontOrder } from "../requestTypes";
import { boletaWhatsappMessage, storefrontWhatsappHref } from "../whatsapp";
import { DottedRow, ReceiptEdge, WhatsappIcon } from "./shared";

export interface BoletaStore {
  slug: string;
  name: string;
  whatsapp: string | null;
  paymentQrUrl: string | null;
  paymentInstructions: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
}

export interface SentOrder {
  order: StorefrontOrder;
  customerName: string;
}

const inputClass =
  "block w-full border-2 border-[#111111] bg-white px-3 py-2.5 font-archivo text-[15px] text-[#111111] outline-none transition-shadow focus:shadow-[3px_3px_0_#111111] disabled:opacity-60";

/** La boleta como recibo: lineas, total, entrega y datos del cliente. */
export function BoletaReceipt({
  store,
  onSent,
  showTitle = true,
  showWhatsappPreview = false,
}: {
  store: BoletaStore;
  onSent: (sent: SentOrder) => void;
  /** "TU BOLETA" arriba: en la hoja del celular el titulo ya esta afuera. */
  showTitle?: boolean;
  /** Burbuja "Asi llega a la tienda" (la hoja del celular tiene lugar). */
  showWhatsappPreview?: boolean;
}) {
  const { lines, total, increment, decrement, remove, markUnavailable, clear } = useBoleta();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("pickup");
  const [customerName, setCustomerName] = useState("");
  const hasUnavailable = lines.some((line) => line.unavailable);
  const bothDeliveries = store.pickupEnabled && store.deliveryEnabled;
  const chosenDelivery = bothDeliveries ? delivery : store.deliveryEnabled ? "delivery" : store.pickupEnabled ? "pickup" : null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || lines.length === 0) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const result = await createStorefrontOrderAction(
        store.slug,
        lines.map((line) => ({ product_id: line.productId, quantity: line.quantity })),
        formData,
      );
      if (result.ok) {
        clear();
        onSent({ order: result.order, customerName: customerName.trim() });
        return;
      }
      setFieldErrors(result.fieldErrors);
      if (result.unavailableProductIds.length > 0) markUnavailable(result.unavailableProductIds);
      if (!Object.keys(result.fieldErrors).length) {
        setFormError(result.message);
        toast.error(result.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo enviar tu pedido.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewMessage = boletaWhatsappMessage({
    storeName: store.name,
    customerName: customerName.trim() || "…",
    order: {
      items: lines.map((line) => ({
        product_name: line.name,
        quantity: line.quantity,
        unit: line.unit,
        line_total: String(Number(line.unitPrice) * line.quantity),
      })),
      total: String(total),
      delivery_method: chosenDelivery,
    },
    formatPrice: formatCurrency,
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="border-2 border-b-0 border-sf-ink bg-white px-5 pb-5 pt-6 font-receipt text-[13px] leading-[1.8] text-[#111111]">
        {showTitle ? <p className="text-center font-display text-xl">TU BOLETA</p> : null}
        <p className={`text-center uppercase ${showTitle ? "" : "font-display text-base"}`}>{store.name}</p>
        <div className="my-3 border-t-2 border-dashed border-[#111111]" />

        {lines.length === 0 ? (
          <p className="py-4 text-center text-sf-muted">
            Todavia no agregaste nada.
            <br />
            Elige productos y envia tu pedido por WhatsApp.
          </p>
        ) : (
          <ul aria-label="Productos de tu boleta" className="space-y-2">
            {lines.map((line) => (
              <li key={line.productId} className={line.unavailable ? "bg-[#FDE4DE] px-1" : ""}>
                <DottedRow left={line.name} right={priceOnly(Number(line.unitPrice) * line.quantity)} />
                {line.unavailable ? (
                  <div className="flex items-center justify-between gap-2 text-[12px] font-bold text-[#B42318]">
                    <span>Ya no esta disponible</span>
                    <button type="button" onClick={() => remove(line.productId)} className="underline">
                      Quitar {line.name}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sf-muted">
                    <button
                      type="button"
                      onClick={() => decrement(line.productId)}
                      aria-label={`Quitar un ${line.name}`}
                      className="h-7 w-7 border-[1.5px] border-[#111111] bg-white font-bold text-[#111111]"
                    >
                      −
                    </button>
                    <span>
                      {line.quantity} × {priceOnly(Number(line.unitPrice))}
                    </span>
                    <button
                      type="button"
                      onClick={() => increment(line.productId)}
                      disabled={line.quantity >= MAX_LINE_QUANTITY}
                      aria-label={`Agregar otro ${line.name}`}
                      className="h-7 w-7 border-[1.5px] border-[#111111] bg-white font-bold text-[#111111] disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="my-3 border-t-2 border-dashed border-[#111111]" />
        <div className="flex items-baseline justify-between text-lg font-bold">
          <span>TOTAL</span>
          <span className="bg-sf-sticker px-1.5 text-sf-onSticker">{formatCurrency(total)}</span>
        </div>

        <div className="mt-4 space-y-3 font-archivo text-sm">
          {bothDeliveries ? (
            <fieldset>
              <legend className="mb-1.5 font-bold">Entrega</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["pickup", "delivery"] as const).map((method) => (
                  <label
                    key={method}
                    className={`cursor-pointer border-2 border-[#111111] px-2 py-2 text-center font-bold ${
                      delivery === method ? "bg-[#111111] text-white" : "bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      value={method}
                      checked={delivery === method}
                      onChange={() => setDelivery(method)}
                      className="sr-only"
                      disabled={isSubmitting}
                    />
                    {method === "pickup" ? "Recojo" : "Envio"}
                    <span className="hidden sm:inline">{method === "pickup" ? " en tienda" : " a domicilio"}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : chosenDelivery ? (
            <p>
              <span className="font-bold">Entrega:</span>{" "}
              {chosenDelivery === "pickup" ? "recoges en la tienda." : "envio a domicilio (pon tu direccion en la nota)."}
            </p>
          ) : null}

          <label className="block font-bold">
            Tu nombre
            <input
              id="customer_name"
              name="customer_name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              maxLength={150}
              placeholder="Para que la tienda sepa quien pide"
              disabled={isSubmitting}
              className={`mt-1.5 ${inputClass}`}
            />
            {fieldErrors.customerName ? <span className="mt-1 block text-xs text-[#B42318]">{fieldErrors.customerName}</span> : null}
          </label>
          <div>
            <label htmlFor="customer_phone" className="block font-bold">
              Tu WhatsApp
            </label>
            <div className="mt-1.5">
              <PhoneCountryInput
                id="customer_phone"
                name="customer_phone"
                required
                disabled={isSubmitting}
                error={Boolean(fieldErrors.customerPhone)}
                errorId="customer_phone-error"
              />
            </div>
            {fieldErrors.customerPhone ? (
              <span id="customer_phone-error" className="mt-1 block text-xs text-[#B42318]">
                {fieldErrors.customerPhone}
              </span>
            ) : null}
          </div>
          <label className="block font-bold">
            Nota (opcional)
            <textarea
              id="note"
              name="note"
              maxLength={500}
              rows={2}
              placeholder={chosenDelivery === "delivery" ? "Tu direccion y alguna referencia" : "A que hora pasas, alguna aclaracion..."}
              disabled={isSubmitting}
              className={`mt-1.5 resize-none ${inputClass}`}
            />
            {fieldErrors.note ? <span className="mt-1 block text-xs text-[#B42318]">{fieldErrors.note}</span> : null}
          </label>
        </div>

        {showWhatsappPreview && lines.length > 0 ? (
          <div className="mt-4">
            <p className="text-[11px] font-bold">ASI LLEGA A LA TIENDA:</p>
            <p className="ml-8 mt-1.5 whitespace-pre-line rounded-[12px_12px_2px_12px] bg-[#DCF8C6] px-3 py-2.5 text-[11px] leading-relaxed">
              {previewMessage}
            </p>
          </div>
        ) : null}

        {formError ? <p className="mt-3 font-archivo text-sm text-[#B42318]">{formError}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting || lines.length === 0 || hasUnavailable}
          className="mt-4 flex w-full items-center justify-center gap-2.5 border-2 border-[#111111] bg-[#0E7A3E] px-4 py-3.5 font-archivo text-base font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <WhatsappIcon />
          {isSubmitting ? "Enviando..." : "Enviar pedido"}
        </button>
        <p className="mt-2.5 text-center font-archivo text-[11px] text-sf-muted">
          La tienda confirma disponibilidad y precio final.
        </p>
      </div>
      <ReceiptEdge className="bg-white" />
    </form>
  );
}

/** Despues de enviar: el monto, el QR para pagar y el mensaje para WhatsApp. */
export function BoletaSent({
  store,
  sent,
  onBack,
}: {
  store: BoletaStore;
  sent: SentOrder;
  onBack: () => void;
}) {
  const message = boletaWhatsappMessage({
    storeName: store.name,
    customerName: sent.customerName,
    order: sent.order,
    formatPrice: formatCurrency,
  });

  return (
    <div className="text-center text-[#111111]">
      <div className="mx-auto flex h-[150px] w-[150px] -rotate-[8deg] items-center justify-center rounded-full border-[3px] border-[#111111] bg-sf-sticker font-display text-[22px] leading-none text-sf-onSticker shadow-[5px_5px_0_#111111]">
        ¡PEDIDO
        <br />
        ENVIADO!
      </div>
      <p className="mx-auto mt-5 max-w-xs text-[15px] leading-normal text-[#3A3A38]">
        {store.name} recibio tu pedido. Envialo tambien por WhatsApp para que lo confirmen rapido.
      </p>
      <div className="mt-5 border-2 border-[#111111] bg-white p-4">
        <p className="font-receipt text-xs font-bold">MONTO A PAGAR</p>
        <p className="font-display text-[34px]">{formatCurrency(sent.order.total)}</p>
        <ul className="mt-2 space-y-0.5 text-left font-receipt text-[12px]">
          {sent.order.items.map((item, index) => (
            <li key={`${item.product_id}-${index}`}>
              <DottedRow left={`${item.quantity}× ${item.product_name}`} right={priceOnly(Number(item.line_total))} />
            </li>
          ))}
        </ul>
        {store.paymentQrUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen remota (Cloudinary), sin loader configurado */}
            <img
              src={store.paymentQrUrl}
              alt="QR de pago de la tienda"
              className="mx-auto mt-3 h-44 w-44 border-2 border-dashed border-sf-line bg-white object-contain"
            />
            <p className="mt-3 text-[13px] leading-normal text-[#3A3A38]">
              {store.paymentInstructions ?? "Paga con QR y envia el comprobante por WhatsApp."}
            </p>
          </>
        ) : null}
      </div>
      <div className="mt-5 flex flex-col gap-2.5">
        {store.whatsapp ? (
          <a
            href={storefrontWhatsappHref(store.whatsapp, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 rounded-[14px] border-2 border-[#111111] bg-[#0E7A3E] p-4 text-base font-bold text-white hover:opacity-90"
          >
            <WhatsappIcon />
            Enviar pedido por WhatsApp
          </a>
        ) : null}
        <button
          type="button"
          onClick={onBack}
          className="rounded-[14px] border-2 border-[#111111] bg-white p-3.5 text-[15px] font-bold hover:opacity-90"
        >
          Volver al catalogo
        </button>
      </div>
    </div>
  );
}

function priceOnly(amount: number) {
  return formatCurrency(amount).replace(/^\s*Bs\.?\s*/i, "").trim();
}
