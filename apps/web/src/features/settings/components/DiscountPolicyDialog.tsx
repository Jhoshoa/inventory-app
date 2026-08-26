"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Percent } from "lucide-react";
import { toast } from "sonner";
import type { StoreResponse } from "@/features/settings/types";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { updateDiscountPolicyAction } from "../actions";
import type { DiscountPolicyState } from "../types";

const initialState: DiscountPolicyState = {
  ok: false,
  message: "",
  fieldErrors: {},
};

export function DiscountPolicyDialog({ storeData }: { storeData: StoreResponse }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<DiscountPolicyState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowPercentage, setAllowPercentage] = useState(storeData.allow_percentage_discount);
  const [allowManual, setAllowManual] = useState(storeData.allow_manual_discount);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setState(initialState);
    try {
      const nextState = await updateDiscountPolicyAction(initialState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        toast.success(nextState.message);
        setOpen(false);
        router.refresh();
      } else if (!Object.keys(nextState.fieldErrors).length) {
        toast.error(nextState.message || "No se pudo actualizar la politica de descuentos");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar la politica de descuentos.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const fieldErrors = state.ok ? {} : state.fieldErrors;

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Percent className="h-4 w-4" aria-hidden="true" />
        Descuentos
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTitle close>Politica de descuentos</DialogTitle>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <div className="space-y-6">
              <p className="text-sm text-text-muted">
                Define que descuentos pueden aplicar tus cajeros al momento de cobrar. Solo tu, como
                propietario, puedes cambiar estos limites.
              </p>

              <div className="space-y-3 rounded-md border border-app-border p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-text-strong">
                  <input
                    type="checkbox"
                    name="allow_percentage_discount"
                    className="h-4 w-4 rounded border-app-borderStrong text-brand-700 focus:ring-focus"
                    checked={allowPercentage}
                    onChange={(event) => setAllowPercentage(event.target.checked)}
                  />
                  Permitir descuento por porcentaje
                </label>
                <div className="space-y-1">
                  <Label htmlFor="max_percentage_discount">Porcentaje maximo permitido (%)</Label>
                  <Input
                    id="max_percentage_discount"
                    name="max_percentage_discount"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    disabled={!allowPercentage}
                    defaultValue={storeData.max_percentage_discount}
                  />
                  <FieldError message={fieldErrors.maxPercentageDiscount} />
                </div>
              </div>

              <div className="space-y-3 rounded-md border border-app-border p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-text-strong">
                  <input
                    type="checkbox"
                    name="allow_manual_discount"
                    className="h-4 w-4 rounded border-app-borderStrong text-brand-700 focus:ring-focus"
                    checked={allowManual}
                    onChange={(event) => setAllowManual(event.target.checked)}
                  />
                  Permitir rebaja manual (monto fijo)
                </label>
                <div className="space-y-1">
                  <Label htmlFor="max_manual_discount_amount">Rebaja maxima permitida (Bs.)</Label>
                  <Input
                    id="max_manual_discount_amount"
                    name="max_manual_discount_amount"
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={!allowManual}
                    defaultValue={storeData.max_manual_discount_amount}
                  />
                  <FieldError message={fieldErrors.maxManualDiscountAmount} />
                </div>
              </div>

              <div className="space-y-2 rounded-md border border-app-border bg-app-surface-muted p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-text-strong">
                  <input
                    type="checkbox"
                    name="allow_cashier_discount_override"
                    className="h-4 w-4 rounded border-app-borderStrong text-brand-700 focus:ring-focus"
                    defaultChecked={storeData.allow_cashier_discount_override}
                  />
                  Permitir que el cajero elija que descuento aplicar
                </label>
                <p className="text-xs text-text-muted">
                  Los productos pueden tener su propio descuento configurado desde Productos. Por
                  defecto, en cada venta se aplica automaticamente el descuento que mas beneficie al
                  cliente (el de producto o el manual), sin sumarlos. Activa esta opcion si quieres
                  que el cajero pueda elegir manualmente cual de los dos aplicar, o ninguno.
                </p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
