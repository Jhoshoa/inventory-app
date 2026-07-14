"use client";

import { useId, type FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DialogOverlay, DialogSurface } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { deleteProductAction } from "../actions";
import type { ProductActionState } from "../types";

const initialProductActionState: ProductActionState = {
  ok: false,
  fieldErrors: {},
};

export function ProductDeleteDialog({
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
      const nextState = await deleteProductAction(initialProductActionState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        router.replace("/dashboard/products");
        router.refresh();
      }
    } catch (error) {
      setState({
        ok: false,
        message: error instanceof Error ? error.message : "No se pudo eliminar el producto.",
        fieldErrors: {},
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {trigger === "icon" ? (
        <Button variant="icon" onClick={() => setOpen(true)} aria-label="Eliminar">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : (
        <Button variant="ghost" onClick={() => setOpen(true)}>
          Eliminar
        </Button>
      )}
      {open ? (
        <DialogOverlay>
          <DialogSurface titleId={titleId} onClose={() => setOpen(false)} className="w-full max-w-md">
            <h2 id={titleId} className="text-base font-semibold text-text-strong">
              Eliminar producto
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Escribe ELIMINAR para borrar {productName}. El backend validara permisos owner.
            </p>
            <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
              {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
              <input type="hidden" name="product_id" value={productId} />
              <div className="space-y-2">
                <Label htmlFor={`confirm-${productId}`}>Confirmacion</Label>
                <Input id={`confirm-${productId}`} name="confirm" required pattern="ELIMINAR" />
                <FieldError message={state.fieldErrors.confirm} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="danger" disabled={isSubmitting}>
                  {isSubmitting ? "Eliminando..." : "Eliminar"}
                </Button>
              </div>
            </form>
          </DialogSurface>
        </DialogOverlay>
      ) : null}
    </>
  );
}
