"use client";

import { type FormEvent, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { formatCurrency } from "@/lib/format/currency";
import { voidSaleAction } from "../actions";
import { saleUnits, VOID_REASONS } from "../list";
import { VOID_REASON_MAX, validateVoidSale } from "../schemas";
import type { Sale } from "../types";

/**
 * Anular (tablero P06, solo el dueño): hoja en el celular, ventana en escritorio. La razón
 * es obligatoria; los chips la llenan. Si la API responde 409 (ya estaba anulada desde
 * otro equipo) avisa y la pantalla vuelve a leer la venta.
 */
export function VoidSaleDialog({
  sale,
  open,
  onOpenChange,
  onVoided,
  onConflict,
}: {
  sale: Sale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoided: (sale: Sale) => void;
  onConflict: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const fieldId = useId();
  const units = saleUnits(sale);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setError(undefined);
  }, [open]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return;
    const invalid = validateVoidSale(reason).reason;
    if (invalid) {
      setError(invalid);
      document.getElementById(fieldId)?.focus();
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      const formData = new FormData();
      formData.set("sale_id", sale.id);
      formData.set("reason", reason.trim());
      const result = await voidSaleAction({ ok: false, fieldErrors: {} }, formData);
      if (result.ok && result.sale) {
        toast.success("Venta anulada");
        onOpenChange(false);
        onVoided(result.sale);
      } else if (result.conflict) {
        toast.error(result.message || "La venta ya fue anulada");
        onOpenChange(false);
        onConflict();
      } else if (result.fieldErrors.reason) {
        setError(result.fieldErrors.reason);
      } else {
        toast.error(result.message || "No se pudo anular la venta");
      }
    } catch {
      toast.error("No se pudo anular la venta. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (saving ? undefined : onOpenChange(next))} position="sheet" size="md">
      <DialogTitle close={!saving}>¿Anular la venta de {formatCurrency(sale.total)}?</DialogTitle>
      <DialogDescription>
        {units === 1 ? "La unidad vuelve" : `Las ${units} unidades vuelven`} al stock (a sus mismos lotes) y la venta queda
        como anulada en reportes. No se puede deshacer.
      </DialogDescription>
      <form onSubmit={onSubmit} noValidate className="contents">
        <DialogBody className="space-y-2">
          <Label htmlFor={fieldId}>Razón</Label>
          <div role="group" aria-label="Razones rápidas" className="flex flex-wrap gap-1.5">
            {VOID_REASONS.map((item) => (
              <Chip
                key={item}
                pressed={reason.trim() === item}
                onClick={() => {
                  setReason(item);
                  setError(undefined);
                }}
              >
                {item}
              </Chip>
            ))}
          </div>
          <Textarea
            id={fieldId}
            data-autofocus
            value={reason}
            maxLength={VOID_REASON_MAX}
            onChange={(event) => {
              setReason(event.target.value);
              if (error) setError(undefined);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            className={`!min-h-[76px] ${error ? "!border-status-danger focus:!ring-status-dangerBorder" : ""}`}
          />
          <FieldError id={`${fieldId}-error`} message={error} />
        </DialogBody>
        <DialogFooter className="max-sm:flex-col-reverse max-sm:items-stretch">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" disabled={saving} className="max-sm:!h-[52px]">
            {saving ? "Anulando…" : "Anular venta"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
