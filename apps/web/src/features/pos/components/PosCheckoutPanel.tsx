"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { createSaleAction } from "../actions";
import { calculateCartTotal, serializeCartItems } from "../schemas";
import type { CartItem, CheckoutActionState } from "../types";
import { formatCurrency } from "@/lib/format/currency";

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
  const total = calculateCartTotal(items);
  const isReady = items.length > 0;

  useEffect(() => {
    if (state.refreshedProducts?.length || state.stockConflicts?.length) {
      onStockRefresh?.(state);
    }
  }, [onStockRefresh, state]);

  useEffect(() => {
    if (state.message) {
      if (state.ok) {
        toast.success(state.message);
      } else {
        toast.error(state.message);
      }
    }
  }, [state.message, state.ok]);

  return (
    <form
      action={formAction}
      className={`space-y-4 rounded-lg border p-4 shadow-panel ${
        isReady ? "border-brand-100 bg-app-surface" : "border-app-border bg-app-surface"
      }`}
    >
      <input type="hidden" name="items" value={serializeCartItems(items)} />
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
      <div className="rounded-md border border-app-border bg-app-surface-muted px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-text-muted">Total a cobrar</span>
          <span className="text-lg font-semibold text-text-strong">{formatCurrency(total)}</span>
        </div>
      </div>
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
        <Input id="customer_name" name="customer_name" maxLength={100} placeholder="Opcional" />
      </div>
      <Button className="h-11 w-full" type="submit" disabled={isPending || !isReady}>
        {isPending ? "Confirmando..." : isReady ? "Confirmar venta" : "Carrito vacio"}
      </Button>
    </form>
  );
}
