"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { closeStoreDayAction, openStoreDayAction, reopenStoreDayAction } from "../actions";
import type { CashMovementListResult, StoreDay, StoreDayActionState, StoreDayClosingPreviewResult } from "../types";
import { CashMovementPanel } from "./CashMovementPanel";
import { StoreDayClosingPreview } from "./StoreDayClosingPreview";
import { initialState, sanitizeMoneyInput } from "../utils/store-day-helpers";

export function StoreDayActionForm({
  storeDay,
  closingPreview,
  cashMovements,
  onStoreDayUpdated,
}: {
  storeDay: StoreDay;
  closingPreview?: StoreDayClosingPreviewResult;
  cashMovements?: CashMovementListResult;
  onStoreDayUpdated: (storeDay: StoreDay) => void;
}) {
  const isOpen = storeDay.status === "open";
  const isReopen = !isOpen && Boolean(storeDay.id && storeDay.closed_at);
  const action = isOpen ? closeStoreDayAction : isReopen ? reopenStoreDayAction : openStoreDayAction;
  const [state, setState] = useState<StoreDayActionState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [skipCashCount, setSkipCashCount] = useState(false);
  const noteLabel = isOpen ? "Nota de cierre" : isReopen ? "Nota de reapertura" : "Nota de apertura";
  const buttonLabel = isOpen ? "Cerrar tienda" : isReopen ? "Reabrir tienda" : "Abrir tienda";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const nextState = await action(initialState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok && nextState.storeDay) {
        onStoreDayUpdated(nextState.storeDay);
        toast.success(nextState.message || "Jornada actualizada");
        router.refresh();
      } else if (!nextState.ok) {
        toast.error(nextState.message || "No se pudo procesar la jornada");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo procesar la jornada.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      {isOpen ? <StoreDayClosingPreview preview={closingPreview} /> : null}
      {isOpen ? <CashMovementPanel cashMovements={cashMovements} /> : null}
      <form onSubmit={onSubmit} className="space-y-2">
        {!isOpen && !isReopen ? (
          <>
            <Input
              aria-label="Caja inicial"
              inputMode="decimal"
              name="opening_cash_amount"
              onInput={sanitizeMoneyInput}
              pattern="\d+(\.\d{1,2})?"
              placeholder="Caja inicial"
              title="Use solo numeros con maximo 2 decimales"
            />
            <FieldError message={state.fieldErrors.opening_cash_amount} />
          </>
        ) : null}
        {isOpen ? (
          <>
            <label className="flex items-center gap-2 rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-text-body">
              <input
                className="h-4 w-4 rounded border-app-borderStrong text-brand-700 focus:ring-focus"
                name="skip_cash_count"
                type="checkbox"
                checked={skipCashCount}
                onChange={(event) => setSkipCashCount(event.target.checked)}
              />
              Cerrar sin conteo de efectivo
            </label>
            <Input
              aria-label="Efectivo contado"
              disabled={skipCashCount}
              inputMode="decimal"
              name="counted_cash_amount"
              onInput={sanitizeMoneyInput}
              pattern="\d+(\.\d{1,2})?"
              placeholder={skipCashCount ? "Sin conteo" : "Efectivo contado"}
              required={!skipCashCount}
              title="Use solo numeros con maximo 2 decimales"
            />
            <FieldError message={state.fieldErrors.counted_cash_amount} />
          </>
        ) : null}
        <Input
          aria-label={noteLabel}
          name="note"
          maxLength={255}
          placeholder={`${noteLabel} opcional`}
        />
        <FieldError message={state.fieldErrors.note} />
        {!isOpen && isReopen && storeDay.closing_snapshot_at ? (
          <Button asChild className="w-full" variant="secondary">
            <Link href={`/dashboard/reports/store-days/${storeDay.id}`}>Ver reporte de cierre</Link>
          </Button>
        ) : null}
        <Button className="w-full" type="submit" variant={isOpen ? "danger" : "primary"} disabled={isSubmitting}>
          {isSubmitting ? "Procesando..." : buttonLabel}
        </Button>
      </form>
    </div>
  );
}
