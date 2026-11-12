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
  open: controlledOpen,
  onOpenChange,
  onDeleted,
}: {
  productId: string;
  productName: string;
  /** "none": la abre otro control (p. ej. el menú ⋯ de la lista) con `open`. */
  trigger?: "icon" | "text" | "none";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Por defecto vuelve a la lista; la lista solo se actualiza. */
  onDeleted?: () => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = (next: boolean) => {
    setLocalOpen(next);
    onOpenChange?.(next);
  };
  const [state, setState] = useState<ProductActionState>(initialProductActionState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const router = useRouter();
  const confirmed = confirmText === "ELIMINAR";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !confirmed) return;

    setIsSubmitting(true);
    setState(initialProductActionState);
    try {
      const nextState = await deleteProductAction(initialProductActionState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        toast.success(`"${productName}" eliminado`, { id: "product-deleted" });
        setOpen(false);
        if (onDeleted) onDeleted();
        else router.replace("/dashboard/products");
        router.refresh();
      } else {
        toast.error(nextState.message || "No se pudo eliminar el producto");
      }
    } catch {
      toast.error("No se pudo eliminar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {trigger === "none" ? null : trigger === "icon" ? (
        <Button variant="icon" onClick={() => setOpen(true)} aria-label="Eliminar">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : (
        <Button variant="ghost" className="text-status-danger" onClick={() => setOpen(true)}>
          Eliminar
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (isSubmitting) return;
          setOpen(next);
          if (!next) {
            setConfirmText("");
            setState(initialProductActionState);
          }
        }}
        position="sheet"
        size="sm"
      >
        <DialogTitle close={!isSubmitting}>¿Eliminar {productName}?</DialogTitle>
        <form onSubmit={onSubmit} noValidate className="contents">
          <DialogBody className="space-y-4">
            <p className="text-sm text-text-muted">
              Deja de aparecer en Productos, Vender y el catálogo. Las ventas pasadas y su historial se conservan.
            </p>
            <input type="hidden" name="product_id" value={productId} />
            <div className="space-y-1.5">
              <Label htmlFor={`confirm-${productId}`}>Escribe ELIMINAR para confirmar</Label>
              <Input
                id={`confirm-${productId}`}
                name="confirm"
                data-autofocus
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                error={Boolean(state.fieldErrors.confirm)}
              />
              <FieldError message={state.fieldErrors.confirm} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={isSubmitting || !confirmed}>
              {isSubmitting ? "Eliminando…" : "Eliminar producto"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
