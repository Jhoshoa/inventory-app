"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { updateDefaultAlertDaysAction } from "../actions";
import { MAX_ALERT_DAYS, validateDefaultAlertDays } from "../schemas";

/**
 * Aviso de vencimiento por defecto (tablero P01B, backend B4): cuántos días antes
 * de vencer se avisa de un lote cuando al cargarlo no se escribe otro número.
 */
export function ExpiryAlertDialog({
  open,
  days,
  onOpenChange,
}: {
  open: boolean;
  days: number;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} position="sheet" size="sm">
      {open ? <ExpiryAlertForm days={days} onDone={() => onOpenChange(false)} /> : null}
    </Dialog>
  );
}

function ExpiryAlertForm({ days, onDone }: { days: number; onDone: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState(String(days));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const fieldError = validateDefaultAlertDays(value);
    setError(fieldError);
    if (fieldError) return;
    if (Number(value.trim()) === days) {
      onDone();
      return;
    }
    setSaving(true);
    try {
      const result = await updateDefaultAlertDaysAction(value);
      if (result.ok) {
        toast.success(result.message ?? "Aviso de vencimiento guardado");
        onDone();
        router.refresh();
      } else if (result.fieldError) {
        setError(result.fieldError);
      } else {
        toast.error(result.message ?? "No se pudo guardar el aviso de vencimiento");
      }
    } catch {
      toast.error("No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogTitle close={!saving}>Aviso de vencimiento</DialogTitle>
      <form onSubmit={onSubmit} noValidate className="contents">
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="default-alert-days">Avisar por defecto (días antes)</Label>
            <Input
              id="default-alert-days"
              name="default_alert_days"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_ALERT_DAYS}
              step={1}
              data-autofocus
              className="max-w-[140px] text-base"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
              error={Boolean(error)}
              aria-describedby={`default-alert-days-hint${error ? " default-alert-days-error" : ""}`}
            />
            <FieldError id="default-alert-days-error" message={error ?? undefined} />
            <p id="default-alert-days-hint" className="text-xs text-text-muted">
              Se usa al cargar un lote si no escribes otro número. Entero de 0 a {MAX_ALERT_DAYS}.
            </p>
          </div>
          <div className="rounded-control border border-status-infoBorder bg-status-infoBg p-3 text-sm text-text-body">
            <p className="font-bold text-text-strong">Así funciona</p>
            <p className="mt-1">
              Al vender sale primero el lote que vence antes. Los vencidos no se venden solos: se retiran desde el
              producto. En Inicio ves los que están por vencer.
            </p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onDone} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
