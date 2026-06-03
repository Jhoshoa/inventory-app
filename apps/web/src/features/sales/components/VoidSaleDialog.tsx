"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DialogSurface } from "@/components/ui/Dialog";
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
  const [state, formAction, isPending] = useActionState(voidSaleAction, initialVoidState);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Anular venta
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-strong/30 p-4">
          <DialogSurface className="w-full max-w-md">
            <h2 className="text-base font-semibold text-text-strong">Anular venta</h2>
            <p className="mt-1 text-sm text-text-muted">
              Esta accion devuelve stock y requiere permisos de owner.
            </p>
            <form action={formAction} className="mt-5 space-y-4">
              <input type="hidden" name="sale_id" value={saleId} />
              {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
              <div className="space-y-2">
                <Label htmlFor={`void-reason-${saleId}`}>Razon</Label>
                <Textarea id={`void-reason-${saleId}`} name="reason" />
                <FieldError message={state.fieldErrors.reason} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="danger" disabled={isPending}>
                  {isPending ? "Anulando..." : "Confirmar anulacion"}
                </Button>
              </div>
            </form>
          </DialogSurface>
        </div>
      ) : null}
    </>
  );
}
