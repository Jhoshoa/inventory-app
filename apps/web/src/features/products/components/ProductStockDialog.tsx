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
import { STOCK_ADJUSTMENT_MAX } from "../schemas";
import type { ProductActionState } from "../types";

const initialProductActionState: ProductActionState = {
  ok: false,
  fieldErrors: {},
};

export function ProductStockDialog({
  productId,
  productName,
  currentStock,
  trigger = "text",
}: {
  productId: string;
  productName: string;
  currentStock: number;
  trigger?: "icon" | "text";
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ProductActionState>(initialProductActionState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quantity, setQuantity] = useState("");
  const router = useRouter();

  const parsedQuantity = Number(quantity);
  const hasValidQuantity = quantity.trim() !== "" && Number.isInteger(parsedQuantity) && parsedQuantity !== 0;
  const resultingStock = hasValidQuantity ? currentStock + parsedQuantity : currentStock;
  const isDeduction = hasValidQuantity && parsedQuantity < 0;

  function resetLocalState() {
    setQuantity("");
    setState(initialProductActionState);
  }

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
        resetLocalState();
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
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetLocalState();
        }}
      >
        <DialogTitle close>Ajustar stock</DialogTitle>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <p className="text-sm text-text-muted">{productName}</p>
            <p className="mt-1 text-sm text-text-strong">
              Stock actual: <span className="font-semibold">{currentStock}</span> unidades
            </p>
            <input type="hidden" name="product_id" value={productId} />
            <input type="hidden" name="current_stock" value={currentStock} />
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`quantity-${productId}`}>Cantidad a ajustar</Label>
                <p className="text-xs text-text-muted">
                  Usa un numero positivo para sumar stock (ej. 10) o negativo para descontarlo (ej. -5).
                </p>
                <Input
                  id={`quantity-${productId}`}
                  name="quantity"
                  type="number"
                  step="1"
                  min={-STOCK_ADJUSTMENT_MAX}
                  max={STOCK_ADJUSTMENT_MAX}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  error={Boolean(state.fieldErrors.quantity)}
                />
                <FieldError message={state.fieldErrors.quantity} />
                {hasValidQuantity ? (
                  <p className={`text-xs ${resultingStock < 0 ? "text-status-danger" : "text-text-muted"}`}>
                    Stock resultante: {resultingStock} unidades
                    {resultingStock < 0 ? " (insuficiente)" : ""}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`reason-${productId}`}>
                  Razon{isDeduction ? <span className="text-status-danger"> *</span> : " (opcional)"}
                </Label>
                {isDeduction ? (
                  <p className="text-xs text-text-muted">
                    Requerida para descontar stock (ej. merma, conteo fisico, producto danado).
                  </p>
                ) : null}
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
