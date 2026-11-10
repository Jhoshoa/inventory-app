"use client";

import { type FormEvent, useEffect, useState } from "react";
import { MessageCircle, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PhoneCountryInput } from "@/components/ui/PhoneCountryInput";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Textarea } from "@/components/ui/Textarea";
import { formatCurrency } from "@/lib/format/currency";
import { splitInternationalPhone } from "@/lib/format/phone";
import { MAX_LINE_QUANTITY, useBoleta } from "../boleta";
import { createStorefrontOrderAction } from "../requestActions";
import type { StorefrontOrder } from "../requestTypes";
import { readableTextColor } from "../settings";
import { boletaWhatsappMessage, storefrontWhatsappHref } from "../whatsapp";

interface StorefrontBoletaProps {
  slug: string;
  storeName: string;
  storeWhatsapp: string | null;
  paymentQrUrl: string | null;
  paymentInstructions: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  colorPrimary: string | null;
}

/** Barra fija con el total de la boleta y el dialogo para revisarla y enviarla. */
export function StorefrontBoleta(props: StorefrontBoletaProps) {
  const { lines, itemCount, total } = useBoleta();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<{ order: StorefrontOrder; customerName: string } | null>(null);

  // El boton flotante de WhatsApp sube para no tapar la barra.
  useEffect(() => {
    if (lines.length > 0) document.body.dataset.boleta = "open";
    else delete document.body.dataset.boleta;
    return () => {
      delete document.body.dataset.boleta;
    };
  }, [lines.length]);

  const background = props.colorPrimary ?? "#111111";

  return (
    <>
      {lines.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-app-border bg-app-surface/95 px-4 py-3 shadow-floating backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-text-muted">
                Tu boleta · {itemCount} {itemCount === 1 ? "producto" : "productos"}
              </p>
              <p className="text-base font-semibold tabular-nums text-text-strong">{formatCurrency(total)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSent(null);
                setOpen(true);
              }}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-5 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: background, color: readableTextColor(background) }}
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Ver boleta
            </button>
          </div>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen} size="md">
        {sent ? (
          <BoletaSent {...props} order={sent.order} customerName={sent.customerName} onClose={() => setOpen(false)} />
        ) : (
          <BoletaReview
            {...props}
            onCancel={() => setOpen(false)}
            onSent={(order, customerName) => setSent({ order, customerName })}
          />
        )}
      </Dialog>
    </>
  );
}

function BoletaReview({
  slug,
  storeWhatsapp,
  pickupEnabled,
  deliveryEnabled,
  onCancel,
  onSent,
}: StorefrontBoletaProps & {
  onCancel: () => void;
  onSent: (order: StorefrontOrder, customerName: string) => void;
}) {
  const { lines, total, setQuantity, remove, markUnavailable, clear } = useBoleta();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const hasUnavailable = lines.some((line) => line.unavailable);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || lines.length === 0) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const result = await createStorefrontOrderAction(
        slug,
        lines.map((line) => ({ product_id: line.productId, quantity: line.quantity })),
        formData,
      );
      if (result.ok) {
        clear();
        onSent(result.order, String(formData.get("customer_name") ?? "").trim());
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

  return (
    <form onSubmit={onSubmit} noValidate className="contents">
      <DialogTitle close>Tu boleta</DialogTitle>
      <DialogDescription>
        Revisa tu pedido y deja tus datos: la tienda lo recibe y te contacta para confirmar. No es un pago en
        linea.
      </DialogDescription>
      <DialogBody>
        <div className="space-y-5">
          {lines.length === 0 ? (
            <p className="text-sm text-text-muted">Tu boleta esta vacia.</p>
          ) : (
            <ul className="divide-y divide-dashed divide-app-borderStrong rounded-md border border-app-border">
              {lines.map((line) => (
                <li key={line.productId} className={`flex gap-3 px-3 py-3 ${line.unavailable ? "bg-status-dangerBg" : ""}`}>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm font-medium text-text-strong">{line.name}</p>
                    <p className="text-xs text-text-muted">
                      {formatCurrency(line.unitPrice)} / {line.unit}
                    </p>
                    {line.unavailable ? (
                      <p className="text-xs font-medium text-status-danger">Ya no esta disponible: quitalo para continuar</p>
                    ) : (
                      <QuantityStepper
                        value={line.quantity}
                        onIncrement={() => setQuantity(line.productId, line.quantity + 1)}
                        onDecrement={() => setQuantity(line.productId, line.quantity - 1)}
                        onValueChange={(value) => setQuantity(line.productId, value)}
                        incrementDisabled={line.quantity >= MAX_LINE_QUANTITY}
                        max={MAX_LINE_QUANTITY}
                      />
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                    <p className="text-sm font-semibold tabular-nums text-text-strong">
                      {formatCurrency(Number(line.unitPrice) * line.quantity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(line.productId)}
                      aria-label={`Quitar ${line.name}`}
                      className="rounded-md p-1.5 text-text-muted hover:bg-app-surface-muted hover:text-status-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
              <li className="flex items-center justify-between px-3 py-3">
                <span className="text-sm font-semibold text-text-strong">Total</span>
                <span className="text-base font-bold tabular-nums text-text-strong">{formatCurrency(total)}</span>
              </li>
            </ul>
          )}

          <Field name="customer_name" label="Tu nombre" error={fieldErrors.customerName}>
            <Input id="customer_name" name="customer_name" required maxLength={150} disabled={isSubmitting} />
          </Field>
          <Field name="customer_phone" label="Tu telefono / WhatsApp" error={fieldErrors.customerPhone}>
            <PhoneCountryInput
              id="customer_phone"
              name="customer_phone"
              defaultCountry={splitInternationalPhone(storeWhatsapp).country}
              required
              placeholder="Tu numero"
              disabled={isSubmitting}
            />
          </Field>
          {pickupEnabled && deliveryEnabled ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-text-strong">Como lo recibes</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <label className="flex items-center gap-2 text-sm text-text-body">
                  <input type="radio" name="delivery" value="pickup" defaultChecked disabled={isSubmitting} />
                  Recojo en tienda
                </label>
                <label className="flex items-center gap-2 text-sm text-text-body">
                  <input type="radio" name="delivery" value="delivery" disabled={isSubmitting} />
                  Envio a domicilio
                </label>
              </div>
            </fieldset>
          ) : deliveryEnabled ? (
            <p className="text-sm text-text-muted">Esta tienda hace envios a domicilio: indica tu direccion en la nota.</p>
          ) : pickupEnabled ? (
            <p className="text-sm text-text-muted">Recoges tu pedido en la tienda.</p>
          ) : null}
          <Field name="note" label="Nota (opcional)" error={fieldErrors.note}>
            <Textarea
              id="note"
              name="note"
              maxLength={500}
              rows={2}
              placeholder="Ej. Direccion de entrega, a que hora pasas a recogerlo..."
              disabled={isSubmitting}
            />
          </Field>
          {formError ? <p className="text-sm text-status-danger">{formError}</p> : null}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Seguir comprando
        </Button>
        <Button type="submit" disabled={isSubmitting || lines.length === 0 || hasUnavailable}>
          {isSubmitting ? "Enviando..." : "Enviar pedido"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function BoletaSent({
  storeName,
  storeWhatsapp,
  paymentQrUrl,
  paymentInstructions,
  order,
  customerName,
  onClose,
}: StorefrontBoletaProps & { order: StorefrontOrder; customerName: string; onClose: () => void }) {
  const message = boletaWhatsappMessage({ storeName, customerName, order, formatPrice: formatCurrency });

  return (
    <>
      <DialogTitle close>Pedido enviado</DialogTitle>
      <DialogBody>
        <div className="space-y-4">
          <p className="text-sm text-text-body">
            Listo, {storeName} recibio tu pedido y te va a contactar para confirmarlo.
          </p>
          <ul className="space-y-1 rounded-md border border-app-border p-3 text-sm">
            {order.items.map((item) => (
              <li key={`${item.product_id}-${item.product_name}`} className="flex justify-between gap-3">
                <span className="min-w-0 text-text-body">
                  {item.quantity} x {item.product_name}
                </span>
                <span className="shrink-0 tabular-nums text-text-strong">{formatCurrency(item.line_total)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 border-t border-dashed border-app-borderStrong pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(order.total)}</span>
            </li>
          </ul>
          {paymentQrUrl ? (
            <div className="space-y-2 rounded-lg border border-app-border bg-app-surface-muted p-4 text-center">
              <p className="text-xs font-medium text-text-muted">Si prefieres, ya puedes pagar con este QR</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen remota (Cloudinary), sin loader configurado */}
              <img
                src={paymentQrUrl}
                alt="QR de pago de la tienda"
                className="mx-auto h-48 w-48 rounded-md border border-app-border bg-app-surface object-contain"
              />
              {paymentInstructions ? <p className="text-xs text-text-muted">{paymentInstructions}</p> : null}
            </div>
          ) : null}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
        {storeWhatsapp ? (
          <Button asChild>
            <a href={storefrontWhatsappHref(storeWhatsapp, message)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Enviar detalle por WhatsApp
            </a>
          </Button>
        ) : null}
      </DialogFooter>
    </>
  );
}
