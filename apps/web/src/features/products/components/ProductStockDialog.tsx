"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog";
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
        setOpen(false);
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTitle close>Ajustar stock</DialogTitle>
        <form onSubmit={onSubmit}>
          <DialogBody>
            <p className="text-sm text-text-muted">{productName}</p>
            <input type="hidden" name="product_id" value={productId} />
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`quantity-${productId}`}>Cantidad delta</Label>
                <Input id={`quantity-${productId}`} name="quantity" type="number" step="1" />
                <FieldError message={state.fieldErrors.quantity} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`reason-${productId}`}>Razon</Label>
                <Textarea id={`reason-${productId}`} name="reason" maxLength={120} />
                <FieldError message={state.fieldErrors.reason} />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar ajuste"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
