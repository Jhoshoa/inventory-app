"use client";

import { type FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { adjustStockAction } from "../actions";
import { batchOptionLabel } from "../batches";
import { MAX_ALERT_DAYS, STOCK_ADJUSTMENT_MAX } from "../schemas";
import type { ProductActionState, ProductBatch } from "../types";

const initialProductActionState: ProductActionState = {
  ok: false,
  fieldErrors: {},
};

export function ProductStockDialog({
  productId,
  productName,
  currentStock,
  trigger = "text",
  triggerLabel = "Ajustar stock",
  batches = [],
  preset,
}: {
  productId: string;
  productName: string;
  currentStock: number;
  /** "compact": botón chico con borde, como en las filas de la lista. */
  trigger?: "icon" | "text" | "compact";
  triggerLabel?: string;
  /** Lotes con unidades: para elegir de cual sale al descontar. */
  batches?: ProductBatch[];
  /** Valores con los que abre (p. ej. "Retirar" un lote vencido). */
  preset?: { quantity: number; batchId: string; reason?: string };
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ProductActionState>(initialProductActionState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quantity, setQuantity] = useState(preset ? String(preset.quantity) : "");
  const [expiresOn, setExpiresOn] = useState("");
  const [batchId, setBatchId] = useState(preset?.batchId ?? "");
  const router = useRouter();
  // Puede haber varios en la pagina (uno por lote): ids propios para los labels.
  const fieldId = useId();

  const parsedQuantity = Number(quantity);
  const hasValidQuantity = quantity.trim() !== "" && Number.isInteger(parsedQuantity) && parsedQuantity !== 0;
  const resultingStock = hasValidQuantity ? currentStock + parsedQuantity : currentStock;
  const isDeduction = hasValidQuantity && parsedQuantity < 0;
  const isAddition = hasValidQuantity && parsedQuantity > 0;
  const selectedBatch = batches.find((batch) => batch.id === batchId);

  function resetLocalState() {
    setQuantity(preset ? String(preset.quantity) : "");
    setExpiresOn("");
    setBatchId(preset?.batchId ?? "");
    setState(initialProductActionState);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setState(initialProductActionState);
    try {
      const nextState = await adjustStockAction(initialProductActionState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        toast.success("Stock actualizado");
        setOpen(false);
        resetLocalState();
        router.refresh();
      } else {
        toast.error(nextState.message || "No se pudo ajustar el stock");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo ajustar el stock.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {trigger === "icon" ? (
        <Button variant="icon" onClick={() => setOpen(true)} aria-label={triggerLabel}>
          <PackagePlus className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : trigger === "compact" ? (
        <Button variant="secondary" className="!h-[34px] rounded-[10px] !px-2.5 text-[13px]" onClick={() => setOpen(true)}>
          {triggerLabel}
        </Button>
      ) : (
        <Button variant="ghost" onClick={() => setOpen(true)}>
          {triggerLabel}
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetLocalState();
        }}
      >
        <DialogTitle close>Ajustar stock</DialogTitle>
        <form onSubmit={onSubmit} noValidate className="contents">
          <DialogBody>
            <p className="text-sm text-text-muted">{productName}</p>
            <p className="mt-1 text-sm text-text-strong">
              Stock actual: <span className="font-semibold">{currentStock}</span> unidades
            </p>
            <input type="hidden" name="product_id" value={productId} />
            <input type="hidden" name="current_stock" value={currentStock} />
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`quantity-${fieldId}`}>Cantidad a ajustar</Label>
                <p className="text-xs text-text-muted">
                  Usa un numero positivo para sumar stock (ej. 10) o negativo para descontarlo (ej. -5).
                </p>
                <Input
                  id={`quantity-${fieldId}`}
                  name="quantity"
                  type="number"
                  step="1"
                  min={-STOCK_ADJUSTMENT_MAX}
                  max={STOCK_ADJUSTMENT_MAX}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  error={Boolean(state.fieldErrors.quantity)}
                />
                <FieldError message={state.fieldErrors.quantity} />
                {hasValidQuantity ? (
                  <p className={`text-xs ${resultingStock < 0 ? "text-status-danger" : "text-text-muted"}`}>
                    Stock resultante: {resultingStock} unidades
                    {resultingStock < 0 ? " (insuficiente)" : ""}
                  </p>
                ) : null}
              </div>
              {isAddition ? (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                  <div className="space-y-1">
                    <Label htmlFor={`expires-${fieldId}`}>Vence el (opcional)</Label>
                    <Input
                      id={`expires-${fieldId}`}
                      name="expires_on"
                      type="date"
                      value={expiresOn}
                      onChange={(event) => setExpiresOn(event.target.value)}
                      error={Boolean(state.fieldErrors.expires_on)}
                    />
                    <FieldError message={state.fieldErrors.expires_on} />
                  </div>
                  {expiresOn ? (
                    <div className="space-y-1">
                      <Label htmlFor={`alert-${fieldId}`}>Avisar dias antes</Label>
                      <Input
                        id={`alert-${fieldId}`}
                        name="alert_days"
                        type="number"
                        step="1"
                        min={0}
                        max={MAX_ALERT_DAYS}
                        placeholder="Como la tienda"
                        aria-describedby={`alert-hint-${fieldId}`}
                        error={Boolean(state.fieldErrors.alert_days)}
                      />
                      <p id={`alert-hint-${fieldId}`} className="text-xs text-text-muted">
                        Vacío: usa el aviso de vencimiento de la tienda.
                      </p>
                      <FieldError message={state.fieldErrors.alert_days} />
                    </div>
                  ) : null}
                  {expiresOn ? (
                    <p className="text-xs text-text-muted sm:col-span-2">
                      Entra como un lote nuevo. Las ventas sacan primero del lote que vence antes.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {isDeduction && batches.length > 0 ? (
                <div className="space-y-1">
                  <Label htmlFor={`batch-${fieldId}`}>Sale de</Label>
                  <Select
                    id={`batch-${fieldId}`}
                    name="batch_id"
                    value={batchId}
                    onChange={(event) => setBatchId(event.target.value)}
                  >
                    <option value="">Automatico: primero el que vence antes</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batchOptionLabel(batch)}
                      </option>
                    ))}
                  </Select>
                  {selectedBatch ? (
                    <input type="hidden" name="batch_available" value={selectedBatch.quantity_remaining} />
                  ) : null}
                  <FieldError message={state.fieldErrors.batch_id} />
                </div>
              ) : null}
              <div className="space-y-1">
                <Label htmlFor={`reason-${fieldId}`}>
                  Razon{isDeduction ? <span className="text-status-danger"> *</span> : " (opcional)"}
                </Label>
                {isDeduction ? (
                  <p className="text-xs text-text-muted">
                    Requerida para descontar stock (ej. merma, conteo fisico, producto danado).
                  </p>
                ) : null}
                <Textarea
                  id={`reason-${fieldId}`}
                  name="reason"
                  maxLength={120}
                  defaultValue={preset?.reason}
                />
                <FieldError message={state.fieldErrors.reason} />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar ajuste"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
