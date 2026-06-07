"use client";

import { useActionState, useEffect } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { createSaleAction } from "../actions";
import { serializeCartItems } from "../schemas";
import type { CartItem, CheckoutActionState } from "../types";

const initialCheckoutState: CheckoutActionState = {
  ok: false,
  fieldErrors: {},
};

export function PosCheckoutPanel({
  items,
  onStockRefresh,
}: {
  items: CartItem[];
  onStockRefresh?: (state: CheckoutActionState) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createSaleAction,
    initialCheckoutState,
  );

  useEffect(() => {
    if (state.refreshedProducts?.length || state.stockConflicts?.length) {
      onStockRefresh?.(state);
    }
  }, [onStockRefresh, state]);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
      <input type="hidden" name="items" value={serializeCartItems(items)} />
      <div>
        <h2 className="text-base font-semibold text-text-strong">Checkout</h2>
        <p className="mt-1 text-sm text-text-muted">Confirma el metodo de pago y registra la venta.</p>
      </div>
      {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
      <FieldError message={state.fieldErrors.items} />
      <div className="space-y-2">
        <Label htmlFor="payment_method">Metodo de pago</Label>
        <Select id="payment_method" name="payment_method" defaultValue="efectivo">
          <option value="efectivo">Efectivo</option>
          <option value="qr">QR</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
        </Select>
        <FieldError message={state.fieldErrors.payment_method} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customer_name">Cliente</Label>
        <Input id="customer_name" name="customer_name" placeholder="Opcional" />
      </div>
      <Button className="w-full" type="submit" disabled={isPending || items.length === 0}>
        {isPending ? "Confirmando..." : "Confirmar venta"}
      </Button>
    </form>
  );
}
