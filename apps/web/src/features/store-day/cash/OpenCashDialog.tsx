"use client";

import { useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { formatCurrency, parseMoney } from "@/lib/format/currency";
import { formatBusinessDateShort } from "@/lib/format/datetime";
import { openStoreDayAction } from "../actions";
import { timezoneLabel } from "./cashRegister";
import { useStoreDayAction } from "./useStoreDayAction";

const QUICK_AMOUNTS = ["50", "100", "200"];

export function OpenCashDialog({
  open,
  onOpenChange,
  businessDate,
  timezone,
  lastOpeningAmount,
  onOpened,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessDate: string;
  timezone: string;
  lastOpeningAmount: string | null;
  onOpened: () => void;
}) {
  const [amount, setAmount] = useState("");
  const { state, pending, submit, reset } = useStoreDayAction(openStoreDayAction, () => {
    onOpenChange(false);
    onOpened();
  });
  const amountId = useId();
  const amountErrorId = useId();
  const parsed = parseMoney(amount);
  const submitLabel = parsed.ok ? `Abrir caja con ${formatCurrency(parsed.value)}` : "Abrir caja";

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={close} position="sheet" size="md">
      <DialogTitle close>Abrir caja</DialogTitle>
      <DialogDescription>
        {formatBusinessDateShort(businessDate)} · {timezoneLabel(timezone)}
      </DialogDescription>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit(new FormData(event.currentTarget));
        }}
      >
        <DialogBody className="flex flex-col gap-4">
          {state.message && !state.ok ? <Alert variant="error">{state.message}</Alert> : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={amountId} className="text-sm font-semibold text-text-strong">
              Dinero con el que empiezas (cambio)
            </label>
            <MoneyInput
              id={amountId}
              name="opening_cash_amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0,00"
              error={Boolean(state.fieldErrors.opening_cash_amount)}
              errorId={amountErrorId}
            />
            <FieldError id={amountErrorId} message={state.fieldErrors.opening_cash_amount} />
            <p className="text-xs text-text-muted">Puedes dejarlo en 0. Solo números, hasta 2 decimales.</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Montos rápidos">
              {QUICK_AMOUNTS.map((value) => (
                <QuickChip key={value} active={amount === value} onClick={() => setAmount(value)}>
                  {value}
                </QuickChip>
              ))}
              {lastOpeningAmount !== null ? (
                <QuickChip
                  active={amount === lastOpeningAmount}
                  onClick={() => setAmount(lastOpeningAmount)}
                >
                  Igual que ayer ({formatCurrency(lastOpeningAmount)})
                </QuickChip>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${amountId}-note`} className="text-sm font-semibold text-text-strong">
              Nota <span className="font-normal text-text-muted">(opcional)</span>
            </label>
            <Input id={`${amountId}-note`} name="note" maxLength={255} error={Boolean(state.fieldErrors.note)} />
            <FieldError message={state.fieldErrors.note} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => close(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} className="flex-1 sm:flex-none">
            {pending ? "Abriendo…" : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export function QuickChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-9 rounded-full border px-3 text-[13px] font-semibold ${
        active ? "border-text-strong bg-text-strong text-text-inverse" : "border-app-borderStrong bg-app-surface text-text-body"
      }`}
    >
      {children}
    </button>
  );
}
