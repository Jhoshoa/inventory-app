"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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
        toast.success("Producto eliminado");
        setOpen(false);
        router.replace("/dashboard/products");
        router.refresh();
      } else {
        toast.error(nextState.message || "No se pudo eliminar el producto");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el producto.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
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
