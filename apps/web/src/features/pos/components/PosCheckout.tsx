"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { formatCurrency, parseMoney } from "@/lib/format/currency";
import { queueSale } from "@/lib/offline/syncEngine";
import { createSaleAction } from "../actions";
import {
  calculateCartTotal,
  calculateDiscountAmount,
  calculateProductDiscountTotal,
  changeDue,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHODS,
  quickCashAmounts,
  resolveDiscount,
  serializeCartItems,
  validateCheckout,
  validateManualDiscount,
  type DiscountSourceOverride,
  type DiscountType,
  type ManualDiscountPolicy,
  type PaymentMethod,
} from "../schemas";
import type { CartItem, CheckoutActionState, PosProduct } from "../types";
import type { Sale } from "@/features/sales/types";

export const CHECKOUT_FORM_ID = "pos-checkout";

export type FinishedSale =
  | { kind: "online"; sale: Sale; received: string; change: number; items: CartItem[] }
  | { kind: "offline"; id: string; total: number; paymentMethod: PaymentMethod; createdAt: string; received: string; change: number; items: CartItem[] };

/**
 * Cobro (tablero A · POS / Cobro). El total es una vista previa: la API calcula el
 * real (descuentos y política de la tienda). Sin conexión la venta queda en el equipo.
 */
export function PosCheckout({
  items,
  policy,
  isOnline,
  onFinished,
  onStockChanged,
  customerName,
}: {
  items: CartItem[];
  policy: ManualDiscountPolicy;
  isOnline: boolean;
  onFinished: (sale: FinishedSale) => void;
  onStockChanged: (products: PosProduct[]) => void;
  /** Cliente del pedido que se está cobrando (Cobrar en Vender). */
  customerName?: string;
}) {
  const [payment, setPayment] = useState<PaymentMethod>("efectivo");
  const [received, setReceived] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("");
  const [discountValue, setDiscountValue] = useState("");
  const [override, setOverride] = useState<DiscountSourceOverride>("auto");
  const [customer, setCustomer] = useState(customerName ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);

  // El pedido llega después de montar (se leen sus productos): su cliente se escribe solo.
  useEffect(() => {
    if (customerName) setCustomer(customerName);
  }, [customerName]);

  const subtotal = calculateCartTotal(items);
  const productDiscount = calculateProductDiscountTotal(items);
  const manualAmount = calculateDiscountAmount(subtotal, discountType, discountValue);
  const canOverride = policy.allow_cashier_discount_override;
  const resolved = resolveDiscount({
    override: canOverride ? override : "auto",
    productDiscountAmount: productDiscount,
    manualDiscountType: discountType,
    manualDiscountAmount: manualAmount,
  });
  const total = Math.max(Math.round((subtotal - resolved.amount) * 100) / 100, 0);
  const cash = payment === "efectivo" ? changeDue(received, total) : null;
  const quick = quickCashAmounts(total);
  const manualAllowed = policy.allow_percentage_discount || policy.allow_manual_discount;
  const units = items.reduce((count, item) => count + item.quantity, 0);

  function validate() {
    const found: Record<string, string | undefined> = { ...validateCheckout(items, payment) };
    const discountError = validateManualDiscount(discountType, discountValue, subtotal, policy);
    if (discountError) found.discount_value = discountError;
    if (payment === "efectivo" && received.trim()) {
      if (cash === null) found.received = "Escribe el monto como 50 o 50,50";
      else if (cash.missing > 0) found.received = `Falta ${formatCurrency(cash.missing)}`;
    }
    if (customer.trim().length > 100) found.customer_name = "Máximo 100 caracteres";
    return Object.fromEntries(Object.entries(found).filter(([, value]) => value)) as Record<string, string>;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || items.length === 0) return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const snapshot = items;
    const change = cash?.change ?? 0;

    setSaving(true);
    try {
      if (!isOnline) {
        const queued = await queueSale({
          items: items.map((item) => ({
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: item.product.effective_price,
          })),
          paymentMethod: payment,
          customerName: customer.trim() || null,
          discountType: discountType || null,
          discountValue: discountType ? normalizedMoney(discountValue) : "0",
          discountSourceOverride: canOverride ? override : null,
          totalEstimate: total.toFixed(2),
        });
        onFinished({ kind: "offline", id: queued.id, total, paymentMethod: payment, createdAt: queued.createdAt, received, change, items: snapshot });
        reset();
        return;
      }

      const formData = new FormData();
      formData.set("items", serializeCartItems(items));
      formData.set("payment_method", payment);
      formData.set("customer_name", customer.trim());
      if (discountType) {
        formData.set("discount_type", discountType);
        formData.set("discount_value", discountValue);
      }
      if (canOverride) formData.set("discount_source_override", override);
      const result: CheckoutActionState = await createSaleAction({ ok: false, fieldErrors: {} }, formData);
      if (result.ok && result.sale) {
        // El cambio sale del total real de la API (puede diferir de la vista previa).
        const receivedAmount = received.trim() ? Number(normalizedMoney(received)) : 0;
        const realChange = received.trim() ? Math.max(Math.round((receivedAmount - Number(result.sale.total)) * 100) / 100, 0) : 0;
        onFinished({ kind: "online", sale: result.sale, received, change: realChange, items: snapshot });
        reset();
        return;
      }
      if (result.refreshedProducts?.length) onStockChanged(result.refreshedProducts);
      setErrors(result.fieldErrors ?? {});
      if (result.message) toast.error(result.message);
    } catch {
      toast.error(isOnline ? "No se pudo confirmar la venta. Revisa la conexión e intenta de nuevo." : "No se pudo guardar la venta en este equipo.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setPayment("efectivo");
    setReceived("");
    setDiscountType("");
    setDiscountValue("");
    setOverride("auto");
    setCustomer("");
    setErrors({});
  }

  return (
    <form id={CHECKOUT_FORM_ID} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <dl className="space-y-1 rounded-card bg-app-surface-muted px-3 py-2.5 text-sm">
        <div className="flex justify-between text-text-muted">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatCurrency(subtotal)}</dd>
        </div>
        {resolved.amount > 0 ? (
          <div className="flex justify-between text-status-success">
            <dt>{resolved.label}</dt>
            <dd className="tabular-nums">− {formatCurrency(resolved.amount)}</dd>
          </div>
        ) : productDiscount > 0 ? (
          <div className="flex justify-between text-text-muted">
            <dt>Descuento de producto (no se aplica)</dt>
            <dd className="tabular-nums line-through">− {formatCurrency(productDiscount)}</dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between border-t border-app-border pt-1.5">
          <dt className="font-bold text-text-strong">Total a cobrar</dt>
          <dd className="text-xl font-extrabold tabular-nums text-text-strong">{formatCurrency(total)}</dd>
        </div>
      </dl>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-text-body">Método de pago</legend>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {PAYMENT_METHODS.map((method) => (
            <label
              key={method}
              className={`flex h-11 cursor-pointer items-center justify-center rounded-control border text-sm font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus ${
                payment === method ? "border-brand-700 bg-brand-50 text-brand-800" : "border-app-borderStrong text-text-body hover:bg-app-surface-muted"
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value={method}
                checked={payment === method}
                onChange={() => {
                  setPayment(method);
                  setErrors((current) => ({ ...current, received: undefined, payment_method: undefined }));
                }}
                className="sr-only"
              />
              {PAYMENT_METHOD_LABEL[method]}
            </label>
          ))}
        </div>
      </fieldset>

      {payment === "efectivo" ? (
        <div className="space-y-1.5">
          <label htmlFor="pos-received" className="block text-sm font-medium text-text-body">
            Recibido en efectivo <span className="font-normal text-text-muted">(opcional)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            <MoneyInput
              id="pos-received"
              className="!w-32 text-base font-bold"
              placeholder="0,00"
              value={received}
              onChange={(event) => {
                setReceived(event.target.value);
                setErrors((current) => ({ ...current, received: undefined }));
              }}
              error={Boolean(errors.received)}
              aria-describedby={errors.received ? "pos-received-error" : "pos-change"}
            />
            <QuickAmount label="Justo" onClick={() => setReceived(toInput(quick.exact))} />
            {quick.notes.map((note) => (
              <QuickAmount key={note} label={String(note)} onClick={() => setReceived(String(note))} />
            ))}
          </div>
          {errors.received ? (
            <p id="pos-received-error" className="text-sm text-status-danger">
              {errors.received}
            </p>
          ) : (
            <p id="pos-change" className="text-sm" aria-live="polite">
              {cash && cash.missing === 0 ? (
                <>
                  <span className="text-text-muted">Cambio </span>
                  <strong className="text-lg text-text-strong">{formatCurrency(cash.change)}</strong>
                </>
              ) : cash && cash.missing > 0 ? (
                <span className="font-semibold text-status-danger">Falta {formatCurrency(cash.missing)}</span>
              ) : (
                <span className="text-text-muted">Escribe cuánto te dan para ver el cambio.</span>
              )}
            </p>
          )}
        </div>
      ) : null}

      <details className="group rounded-card border border-app-border px-3 py-2" open={Boolean(discountType || customer || errors.discount_value)}>
        <summary className="cursor-pointer list-none text-sm font-bold text-text-strong">
          Descuento y cliente <span className="font-normal text-text-muted">(opcional)</span>
        </summary>
        <div className="mt-3 space-y-3">
          {manualAllowed ? (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium text-text-body">Descuento manual</legend>
              <div className="flex flex-wrap gap-1.5">
                <DiscountOption checked={!discountType} label="Sin descuento manual" onSelect={() => { setDiscountType(""); setDiscountValue(""); }} />
                {policy.allow_percentage_discount ? (
                  <DiscountOption checked={discountType === "percentage"} label={`% (hasta ${Number(policy.max_percentage_discount)}%)`} onSelect={() => { setDiscountType("percentage"); setDiscountValue(""); }} />
                ) : null}
                {policy.allow_manual_discount ? (
                  <DiscountOption checked={discountType === "fixed"} label={`Rebaja (hasta ${formatCurrency(policy.max_manual_discount_amount)})`} onSelect={() => { setDiscountType("fixed"); setDiscountValue(""); }} />
                ) : null}
              </div>
              {discountType ? (
                <div className="space-y-1">
                  <MoneyInput
                    aria-label={discountType === "percentage" ? "Porcentaje de descuento" : "Rebaja en Bs"}
                    className="!w-32"
                    placeholder={discountType === "percentage" ? "10" : "0,00"}
                    value={discountValue}
                    onChange={(event) => {
                      setDiscountValue(event.target.value);
                      setErrors((current) => ({ ...current, discount_value: undefined }));
                    }}
                    error={Boolean(errors.discount_value)}
                  />
                  {errors.discount_value ? <p className="text-sm text-status-danger">{errors.discount_value}</p> : null}
                </div>
              ) : null}
            </fieldset>
          ) : (
            <p className="text-xs text-text-muted">La tienda no permite descuentos manuales al cobrar.</p>
          )}
          {canOverride && (productDiscount > 0 || discountType) ? (
            <div className="space-y-1">
              <label htmlFor="pos-override" className="block text-sm font-medium text-text-body">
                Qué descuento aplicar
              </label>
              <select
                id="pos-override"
                value={override}
                onChange={(event) => setOverride(event.target.value as DiscountSourceOverride)}
                className="h-control w-full rounded-control border border-app-borderStrong bg-app-surface px-3 text-sm"
              >
                <option value="auto">Automático (el que más le convenga al cliente)</option>
                <option value="product" disabled={productDiscount <= 0}>
                  Solo el de producto
                </option>
                <option value="manual" disabled={!discountType}>
                  Solo el manual
                </option>
                <option value="none">Sin descuento</option>
              </select>
            </div>
          ) : null}
          <div className="space-y-1">
            <label htmlFor="pos-customer" className="block text-sm font-medium text-text-body">
              Cliente <span className="font-normal text-text-muted">(opcional)</span>
            </label>
            <input
              id="pos-customer"
              maxLength={100}
              autoComplete="off"
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
              className="h-control w-full rounded-control border border-app-borderStrong bg-app-surface px-3 text-sm"
            />
            {errors.customer_name ? <p className="text-sm text-status-danger">{errors.customer_name}</p> : null}
          </div>
        </div>
      </details>

      {errors.items ? (
        <p role="alert" className="text-sm font-semibold text-status-danger">
          {errors.items}
        </p>
      ) : null}
      {!isOnline ? (
        <p className="rounded-control border border-status-warningBorder bg-status-warningBg px-3 py-2 text-xs text-status-warning">
          Sin conexión: la venta se guarda en este equipo y se envía sola al volver internet.
        </p>
      ) : null}

      <Button type="submit" className="!h-[52px] text-base" disabled={saving || items.length === 0}>
        {saving ? "Confirmando…" : items.length === 0 ? "Agrega productos" : `Confirmar venta · ${formatCurrency(total)}`}
        <kbd className="ml-1 rounded border border-white/40 px-1 text-[11px] font-normal max-lg:hidden" aria-hidden="true">
          F9
        </kbd>
      </Button>
      <p className="sr-only" aria-live="polite">
        {items.length} productos, {units} unidades
      </p>
    </form>
  );
}

function QuickAmount({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-control rounded-control border border-app-borderStrong px-3 text-sm font-bold text-text-body hover:bg-app-surface-muted"
    >
      {label}
    </button>
  );
}

function DiscountOption({ checked, label, onSelect }: { checked: boolean; label: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onSelect}
      className={`h-9 rounded-full border px-3 text-[13px] font-semibold ${
        checked ? "border-text-strong bg-text-strong text-text-inverse" : "border-app-borderStrong text-text-body hover:bg-app-surface-muted"
      }`}
    >
      {label}
    </button>
  );
}

/** "2,50" → "2.50" (ya validado); "0" si no es un monto. */
function normalizedMoney(text: string) {
  const parsed = parseMoney(text);
  return parsed.ok ? parsed.value : "0";
}

function toInput(value: number) {
  return value.toFixed(2).replace(".", ",").replace(/,00$/, "");
}
