"use client";

import { useId, type FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DialogOverlay, DialogSurface } from "@/components/ui/Dialog";
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
  const titleId = useId();

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
      {open ? (
        <DialogOverlay>
          <DialogSurface titleId={titleId} onClose={() => setOpen(false)} className="w-full max-w-md">
            <h2 id={titleId} className="text-base font-semibold text-text-strong">Anular venta</h2>
            <p className="mt-1 text-sm text-text-muted">
              Esta accion devuelve inventario y requiere permisos de propietario.
            </p>
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <input type="hidden" name="sale_id" value={saleId} />
              {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
              <div className="space-y-2">
                <Label htmlFor={`void-reason-${saleId}`}>Razon</Label>
                <Textarea id={`void-reason-${saleId}`} name="reason" maxLength={200} />
                <FieldError message={state.fieldErrors.reason} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="danger" disabled={isSubmitting}>
                  {isSubmitting ? "Anulando..." : "Confirmar anulacion"}
                </Button>
              </div>
            </form>
          </DialogSurface>
        </DialogOverlay>
      ) : null}
    </>
  );
}
