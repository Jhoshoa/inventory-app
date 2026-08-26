"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import type { StoreResponse } from "@/features/settings/types";
import { queueSale } from "@/lib/offline/syncEngine";
import { createSaleAction } from "../actions";
import {
  calculateCartTotal,
  calculateDiscountAmount,
  calculateProductDiscountTotal,
  serializeCartItems,
  validateCheckout,
  type DiscountSourceOverride,
  type DiscountType,
} from "../schemas";
import type { CartItem, CheckoutActionState } from "../types";
import { formatCurrency } from "@/lib/format/currency";

const initialCheckoutState: CheckoutActionState = {
  ok: false,
  fieldErrors: {},
};

export function PosCheckoutPanel({
  items,
  discountPolicy,
  onStockRefresh,
  isOnline = true,
  onOfflineSaleQueued,
}: {
  items: CartItem[];
  discountPolicy: StoreResponse;
  onStockRefresh?: (state: CheckoutActionState) => void;
  isOnline?: boolean;
  onOfflineSaleQueued?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createSaleAction,
    initialCheckoutState,
  );
  const [discountType, setDiscountType] = useState<DiscountType>("");
  const [discountValue, setDiscountValue] = useState("");
  const [sourceOverride, setSourceOverride] = useState<DiscountSourceOverride>("auto");
  const [offlineErrors, setOfflineErrors] = useState<Record<string, string>>({});
  const [isQueuingOffline, setIsQueuingOffline] = useState(false);
  const subtotal = calculateCartTotal(items);
  const manualDiscountAmount = calculateDiscountAmount(subtotal, discountType, discountValue);
  const productDiscountAmount = calculateProductDiscountTotal(items);
  const isReady = items.length > 0;
  const hasManualDiscountOption = discountPolicy.allow_percentage_discount || discountPolicy.allow_manual_discount;
  const canOverride = discountPolicy.allow_cashier_discount_override;

  useEffect(() => {
    if (state.refreshedProducts?.length || state.stockConflicts?.length) {
      onStockRefresh?.(state);
    }
  }, [onStockRefresh, state]);

  useEffect(() => {
    if (state.message) {
      if (state.ok) {
        toast.success(state.message);
        setDiscountType("");
        setDiscountValue("");
        setSourceOverride("auto");
      } else {
        toast.error(state.message);
      }
    }
  }, [state.message, state.ok]);

  function handleDiscountTypeChange(value: string) {
    setDiscountType(value as DiscountType);
    setDiscountValue("");
  }

  const maxDiscountValue =
    discountType === "percentage"
      ? Number(discountPolicy.max_percentage_discount)
      : discountType === "fixed"
        ? Number(discountPolicy.max_manual_discount_amount)
        : undefined;

  // Refleja en el cliente la misma regla que aplica el backend, solo para
  // mostrar una vista previa; el servidor es siempre la fuente de verdad.
  const resolved = resolveDiscountPreview({
    override: canOverride ? sourceOverride : "auto",
    productDiscountAmount,
    manualDiscountType: discountType,
    manualDiscountAmount,
  });
  const total = subtotal - resolved.amount;

  async function handleOfflineSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isQueuingOffline) return;

    const formData = new FormData(event.currentTarget);
    const paymentMethod = String(formData.get("payment_method") ?? "efectivo");
    const customerName = String(formData.get("customer_name") ?? "").trim();

    const fieldErrors = validateCheckout(items, paymentMethod);
    setOfflineErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setIsQueuingOffline(true);
    try {
      await queueSale({
        items: items.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.effective_price,
        })),
        paymentMethod,
        customerName: customerName || null,
        discountType: discountType || null,
        discountValue: discountValue || "0",
        discountSourceOverride: canOverride ? sourceOverride : null,
        totalEstimate: total.toFixed(2),
      });
      toast.success("Venta guardada en este dispositivo. Se enviara cuando vuelva la conexion.");
      setDiscountType("");
      setDiscountValue("");
      setSourceOverride("auto");
      setOfflineErrors({});
      onOfflineSaleQueued?.();
    } catch {
      toast.error("No se pudo guardar la venta en este dispositivo.");
    } finally {
      setIsQueuingOffline(false);
    }
  }

  const fieldErrors = isOnline ? state.fieldErrors : offlineErrors;

  return (
    <form
      action={isOnline ? formAction : undefined}
      onSubmit={isOnline ? undefined : handleOfflineSubmit}
      className={`space-y-4 rounded-lg border p-4 shadow-panel ${
        isReady ? "border-brand-100 bg-app-surface" : "border-app-border bg-app-surface"
      }`}
    >
      <input type="hidden" name="items" value={serializeCartItems(items)} />
      <input type="hidden" name="discount_type" value={discountType} />
      {canOverride ? <input type="hidden" name="discount_source_override" value={sourceOverride} /> : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-strong">Cobro</h2>
          <p className="mt-1 text-sm text-text-muted">
            {isReady ? "Venta lista para confirmar." : "Agrega productos para habilitar el cobro."}
          </p>
        </div>
        <Badge variant={isReady ? "success" : "default"}>
          {isReady ? "Listo" : "En espera"}
        </Badge>
      </div>

      {productDiscountAmount > 0 ? (
        <div className="rounded-md border border-status-successBorder bg-status-successBg px-3 py-2 text-sm text-status-success">
          Descuento de producto disponible: {formatCurrency(productDiscountAmount)}
        </div>
      ) : null}

      {hasManualDiscountOption ? (
        <div className="space-y-2 rounded-md border border-app-border p-3">
          <Label htmlFor="discount_type_select">Descuento manual (opcional)</Label>
          <Select
            id="discount_type_select"
            value={discountType}
            onChange={(event) => handleDiscountTypeChange(event.target.value)}
          >
            <option value="">Sin descuento manual</option>
            {discountPolicy.allow_percentage_discount ? (
              <option value="percentage">
                Porcentaje (hasta {Number(discountPolicy.max_percentage_discount)}%)
              </option>
            ) : null}
            {discountPolicy.allow_manual_discount ? (
              <option value="fixed">
                Rebaja manual (hasta {formatCurrency(discountPolicy.max_manual_discount_amount)})
              </option>
            ) : null}
          </Select>
          {discountType ? (
            <div>
              <Input
                type="number"
                name="discount_value"
                min={0}
                max={maxDiscountValue}
                step="0.01"
                placeholder={discountType === "percentage" ? "Ej. 10" : "Ej. 15.00"}
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
              />
              <FieldError message={fieldErrors.discount_value} />
            </div>
          ) : null}
        </div>
      ) : null}

      {canOverride && (productDiscountAmount > 0 || manualDiscountAmount > 0) ? (
        <div className="space-y-2 rounded-md border border-app-border p-3">
          <Label htmlFor="discount_source_select">Que descuento aplicar</Label>
          <Select
            id="discount_source_select"
            value={sourceOverride}
            onChange={(event) => setSourceOverride(event.target.value as DiscountSourceOverride)}
          >
            <option value="auto">Automatico (el que mas convenga al cliente)</option>
            <option value="product" disabled={productDiscountAmount <= 0}>
              Solo descuento de producto
            </option>
            <option value="manual" disabled={!discountType}>
              Solo descuento manual
            </option>
            <option value="none">Sin descuento</option>
          </Select>
        </div>
      ) : null}

      <div className="space-y-1 rounded-md border border-app-border bg-app-surface-muted px-3 py-2">
        <div className="flex items-center justify-between gap-3 text-sm text-text-muted">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {resolved.amount > 0 ? (
          <div className="flex items-center justify-between gap-3 text-sm text-status-success">
            <span>{resolved.label}</span>
            <span>-{formatCurrency(resolved.amount)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-text-muted">Total a cobrar</span>
          <span className="text-lg font-semibold text-text-strong">{formatCurrency(total)}</span>
        </div>
      </div>
      {!isOnline ? (
        <div className="rounded-md border border-status-warningBorder bg-status-warningBg px-3 py-2 text-xs text-status-warning">
          Sin conexion: la venta se guardara en este dispositivo y se enviara automaticamente cuando vuelva la conexion.
        </div>
      ) : null}
      <FieldError message={fieldErrors.items} />
      <div className="space-y-2">
        <Label htmlFor="payment_method">Metodo de pago</Label>
        <Select id="payment_method" name="payment_method" defaultValue="efectivo">
          <option value="efectivo">Efectivo</option>
          <option value="qr">QR</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
        </Select>
        <FieldError message={fieldErrors.payment_method} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customer_name">Cliente</Label>
        <Input id="customer_name" name="customer_name" maxLength={100} placeholder="Opcional" />
      </div>
      <Button className="h-11 w-full" type="submit" disabled={isPending || isQueuingOffline || !isReady}>
        {isPending || isQueuingOffline
          ? "Confirmando..."
          : isReady
            ? isOnline
              ? "Confirmar venta"
              : "Guardar venta (sin conexion)"
            : "Carrito vacio"}
      </Button>
    </form>
  );
}

function resolveDiscountPreview({
  override,
  productDiscountAmount,
  manualDiscountType,
  manualDiscountAmount,
}: {
  override: DiscountSourceOverride;
  productDiscountAmount: number;
  manualDiscountType: DiscountType;
  manualDiscountAmount: number;
}): { amount: number; label: string } {
  if (override === "product") {
    return productDiscountAmount > 0
      ? { amount: productDiscountAmount, label: "Descuento de producto" }
      : { amount: 0, label: "" };
  }
  if (override === "manual") {
    return manualDiscountType && manualDiscountAmount > 0
      ? { amount: manualDiscountAmount, label: "Descuento manual" }
      : { amount: 0, label: "" };
  }
  if (override === "none") {
    return { amount: 0, label: "" };
  }
  // auto: empate favorece al manual, igual que el backend.
  if (productDiscountAmount > manualDiscountAmount && productDiscountAmount > 0) {
    return { amount: productDiscountAmount, label: "Descuento de producto" };
  }
  if (manualDiscountAmount > 0) {
    return { amount: manualDiscountAmount, label: "Descuento manual" };
  }
  return { amount: 0, label: "" };
}
