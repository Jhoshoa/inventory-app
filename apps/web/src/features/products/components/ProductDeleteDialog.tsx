"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DialogSurface } from "@/components/ui/Dialog";
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
}: {
  productId: string;
  productName: string;
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
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Eliminar
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-strong/30 p-4">
          <DialogSurface className="w-full max-w-md">
            <h2 className="text-base font-semibold text-text-strong">
              Eliminar producto
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Escribe ELIMINAR para borrar {productName}. El backend validara permisos owner.
            </p>
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
              <input type="hidden" name="product_id" value={productId} />
              <div className="space-y-2">
                <Label htmlFor={`confirm-${productId}`}>Confirmacion</Label>
                <Input id={`confirm-${productId}`} name="confirm" />
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
        </div>
      ) : null}
    </>
  );
}
