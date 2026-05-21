"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DialogSurface } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { cancelImportAction } from "../actions";
import type { ImportActionState, InventoryImport } from "../types";

const initialState: ImportActionState = { ok: false, fieldErrors: {} };

export function ImportCancelDialog({ inventoryImport }: { inventoryImport: InventoryImport }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(cancelImportAction, initialState);

  if (inventoryImport.status === "confirmed") return null;

  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        Cancelar Import Image
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <DialogSurface className="w-full max-w-md">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="import_id" value={inventoryImport.id} />
          <div>
            <h2 className="text-base font-semibold text-slate-950">Cancelar Import Image</h2>
            <p className="mt-1 text-sm text-slate-600">
              Escribe CANCELAR para confirmar. Esta accion no elimina productos ya creados.
            </p>
          </div>
          {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}
          <label className="space-y-1">
            <Label htmlFor="confirm-import-cancel">Confirmacion</Label>
            <Input id="confirm-import-cancel" name="confirm" />
            <FieldError message={state.fieldErrors.confirm} />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cerrar</Button>
            <Button variant="danger" type="submit" disabled={isPending}>
              {isPending ? "Cancelando" : "Cancelar"}
            </Button>
          </div>
        </form>
      </DialogSurface>
    </div>
  );
}
