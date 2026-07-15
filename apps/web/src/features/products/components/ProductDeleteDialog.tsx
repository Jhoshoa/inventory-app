"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog";
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setState(initialProductActionState);
    try {
      const nextState = await deleteProductAction(initialProductActionState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        setOpen(false);
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
      <Dialog open={open} onOpenChange={setOpen} size="sm">
        <DialogTitle close>Eliminar producto</DialogTitle>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <p className="text-sm text-text-muted">
              Escribe ELIMINAR para borrar {productName}. El backend validara permisos owner.
            </p>
            {state.message ? (
              <div className="mt-3">
                <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert>
              </div>
            ) : null}
            <input type="hidden" name="product_id" value={productId} />
            <div className="mt-4 space-y-1">
              <Label htmlFor={`confirm-${productId}`}>Confirmacion</Label>
              <Input id={`confirm-${productId}`} name="confirm" required pattern="ELIMINAR" />
              <FieldError message={state.fieldErrors.confirm} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={isSubmitting}>
              {isSubmitting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
