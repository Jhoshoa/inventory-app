"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { DialogSurface } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { updateImportItemAction } from "../actions";
import { importItemToFormValues } from "../schemas";
import type { ImportActionState, InventoryImportItem } from "../types";

const initialState: ImportActionState = { ok: false, fieldErrors: {} };

export function ImportItemEditor({
  item,
  disabled,
}: {
  item: InventoryImportItem;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(updateImportItemAction, initialState);
  const values = importItemToFormValues(item);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} disabled={disabled}>
        Editar
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <DialogSurface className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="import_id" value={values.import_id} />
          <input type="hidden" name="item_id" value={values.item_id} />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Editar item</h2>
              <p className="mt-1 text-sm text-slate-600">Corrige los datos detectados por OCR.</p>
            </div>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
          </div>

          {state.message ? <Alert variant={state.ok ? "info" : "error"}>{state.message}</Alert> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Nombre" defaultValue={values.name} error={state.fieldErrors.name} />
            <Field name="category" label="Categoria" defaultValue={values.category} error={state.fieldErrors.category} />
            <Field name="sku" label="SKU" defaultValue={values.sku} error={state.fieldErrors.sku} />
            <Field name="unit" label="Unidad" defaultValue={values.unit} error={state.fieldErrors.unit} />
            <Field name="price" label="Precio" defaultValue={values.price} error={state.fieldErrors.price} type="number" step="0.01" />
            <Field name="cost_price" label="Costo" defaultValue={values.cost_price} error={state.fieldErrors.cost_price} type="number" step="0.01" />
            <Field name="stock" label="Stock" defaultValue={values.stock} error={state.fieldErrors.stock} type="number" />
            <Field name="min_stock" label="Minimo" defaultValue={values.min_stock} error={state.fieldErrors.min_stock} type="number" />
            <label className="space-y-1">
              <Label htmlFor={`status-${item.id}`}>Estado</Label>
              <Select id={`status-${item.id}`} name="status" defaultValue={values.status}>
                <option value="draft">Draft</option>
                <option value="approved">Aprobado</option>
                <option value="rejected">Rechazado</option>
              </Select>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Guardando" : "Guardar"}</Button>
          </div>
        </form>
      </DialogSurface>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  error,
  type = "text",
  step,
}: {
  name: string;
  label: string;
  defaultValue: string;
  error?: string;
  type?: string;
  step?: string;
}) {
  return (
    <label className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} type={type} step={step} />
      <FieldError message={error} />
    </label>
  );
}
