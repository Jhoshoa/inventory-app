"use client";

import { useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { formatCurrency } from "@/lib/format/currency";
import { closeStoreDayAction } from "../actions";
import type { StoreDay } from "../types";
import { cashDifference } from "./cashRegister";
import { useStoreDayAction } from "./useStoreDayAction";

const DIFFERENCE_TEXT = {
  even: { label: "Cuadra", className: "text-status-success" },
  short: { label: "falta", className: "text-status-warning" },
  over: { label: "sobra", className: "text-status-warning" },
} as const;

export function CloseCashDialog({
  open,
  onOpenChange,
  expectedCash,
  onClosed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expectedCash: string | null;
  onClosed: (storeDay: StoreDay | undefined) => void;
}) {
  const [skipCount, setSkipCount] = useState(false);
  const [counted, setCounted] = useState("");
  const { state, pending, submit, reset } = useStoreDayAction(closeStoreDayAction, (next) => {
    onOpenChange(false);
    onClosed(next.storeDay);
  });
  const id = useId();
  const difference = skipCount ? null : cashDifference(counted, expectedCash);

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={close} position="sheet" size="md">
      <DialogTitle close>Cerrar caja</DialogTitle>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit(new FormData(event.currentTarget));
        }}
      >
        {skipCount ? <input type="hidden" name="skip_cash_count" value="on" /> : null}
        <DialogBody className="flex flex-col gap-4">
          {state.message && !state.ok ? <Alert variant="error">{state.message}</Alert> : null}
          <div role="radiogroup" aria-label="Conteo" className="grid grid-cols-2 gap-1 rounded-control bg-[#EEF0F4] p-1">
            {[
              { value: false, label: "Contar el efectivo" },
              { value: true, label: "Cerrar sin contar" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={skipCount === option.value}
                onClick={() => setSkipCount(option.value)}
                className={`min-h-10 rounded-[10px] text-sm font-semibold ${
                  skipCount === option.value ? "bg-app-surface text-text-strong shadow-sm" : "text-text-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {!skipCount ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-counted`} className="text-sm font-semibold text-text-strong">
                Efectivo contado (Bs)
              </label>
              <MoneyInput
                id={`${id}-counted`}
                name="counted_cash_amount"
                value={counted}
                onChange={(event) => setCounted(event.target.value)}
                placeholder="0,00"
                error={Boolean(state.fieldErrors.counted_cash_amount)}
                errorId={`${id}-counted-error`}
              />
              <FieldError id={`${id}-counted-error`} message={state.fieldErrors.counted_cash_amount} />
            </div>
          ) : null}
          <dl className="grid grid-cols-2 gap-3 rounded-control bg-app-surface-muted p-3 text-sm">
            <div>
              <dt className="text-text-muted">Debería haber</dt>
              <dd className="text-lg font-bold text-text-strong">{expectedCash ? formatCurrency(expectedCash) : "—"}</dd>
            </div>
            <div aria-live="polite">
              <dt className="text-text-muted">Diferencia</dt>
              <dd className={`text-lg font-bold ${difference ? DIFFERENCE_TEXT[difference.kind].className : "text-text-muted"}`}>
                {skipCount
                  ? "Sin conteo"
                  : difference
                    ? difference.kind === "even"
                      ? "Cuadra"
                      : `${difference.kind === "short" ? "−" : "+"} ${formatCurrency(difference.amount)} (${DIFFERENCE_TEXT[difference.kind].label})`
                    : "—"}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-note`} className="text-sm font-semibold text-text-strong">
              Nota <span className="font-normal text-text-muted">(opcional)</span>
            </label>
            <Input id={`${id}-note`} name="note" maxLength={255} error={Boolean(state.fieldErrors.note)} />
            <FieldError message={state.fieldErrors.note} />
          </div>
          <p className="text-[13px] text-text-muted">Después de cerrar no se puede vender hasta abrir o reabrir la jornada.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => close(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} className="flex-1 sm:flex-none">
            {pending ? "Cerrando…" : "Cerrar caja"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
