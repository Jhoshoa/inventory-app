"use client";

import { useId, type FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DialogOverlay, DialogSurface } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { adjustStockAction } from "../actions";
import type { ProductActionState } from "../types";

const initialProductActionState: ProductActionState = {
  ok: false,
  fieldErrors: {},
};

export function ProductStockDialog({
  productId,
  productName,
  trigger = "text",
}: {
  productId: string;
  productName: string;
  trigger?: "icon" | "text";
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ProductActionState>(initialProductActionState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const titleId = useId();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setState(initialProductActionState);
    try {
      const nextState = await adjustStockAction(initialProductActionState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        toast.success("Stock actualizado");
        router.refresh();
      } else {
        toast.error(nextState.message || "No se pudo ajustar el stock");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo ajustar el stock.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {trigger === "icon" ? (
        <Button variant="icon" onClick={() => setOpen(true)} aria-label="Ajustar stock">
          <PackagePlus className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : (
        <Button variant="ghost" onClick={() => setOpen(true)}>
          Ajustar stock
        </Button>
      )}
      {open ? (
        <DialogOverlay>
          <DialogSurface titleId={titleId} onClose={() => setOpen(false)} className="w-full max-w-md">
            <h2 id={titleId} className="text-base font-semibold text-text-strong">
              Ajustar stock
            </h2>
            <p className="mt-1 text-sm text-text-muted">{productName}</p>
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
              <input type="hidden" name="product_id" value={productId} />
              <div className="space-y-2">
                <Label htmlFor={`quantity-${productId}`}>Cantidad delta</Label>
                <Input id={`quantity-${productId}`} name="quantity" type="number" step="1" />
                <FieldError message={state.fieldErrors.quantity} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`reason-${productId}`}>Razon</Label>
                <Textarea id={`reason-${productId}`} name="reason" maxLength={120} />
                <FieldError message={state.fieldErrors.reason} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cerrar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Guardar ajuste"}
                </Button>
              </div>
            </form>
          </DialogSurface>
        </DialogOverlay>
      ) : null}
    </>
  );
}
