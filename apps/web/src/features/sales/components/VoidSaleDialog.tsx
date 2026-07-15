"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { voidSaleAction } from "../actions";
import type { SaleActionState } from "../types";

const initialVoidState: SaleActionState = {
  ok: false,
  fieldErrors: {},
};

export function VoidSaleDialog({ saleId }: { saleId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SaleActionState>(initialVoidState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setState(initialVoidState);
    try {
      const nextState = await voidSaleAction(initialVoidState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        toast.success("Venta anulada");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(nextState.message || "No se pudo anular la venta");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo anular la venta.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Anular venta
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTitle close>Anular venta</DialogTitle>
        <form onSubmit={onSubmit}>
          <DialogBody>
            <p className="text-sm text-text-muted">
              Esta accion devuelve inventario y requiere permisos de propietario.
            </p>
            <input type="hidden" name="sale_id" value={saleId} />
            <div className="mt-4 space-y-1">
              <Label htmlFor={`void-reason-${saleId}`}>Razon</Label>
              <Textarea id={`void-reason-${saleId}`} name="reason" maxLength={200} />
              <FieldError message={state.fieldErrors.reason} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={isSubmitting}>
              {isSubmitting ? "Anulando..." : "Confirmar anulacion"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
