"use client";

import { useActionState } from "react";
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

export function PosCheckoutPanel({ items }: { items: CartItem[] }) {
  const [state, formAction, isPending] = useActionState(
    createSaleAction,
    initialCheckoutState,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <input type="hidden" name="items" value={serializeCartItems(items)} />
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
