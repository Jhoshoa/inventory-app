"use client";

import { useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { createCashMovementAction } from "../actions";
import { MOVEMENT_TYPES, type CashMovementDirection } from "./cashRegister";
import { QuickChip } from "./OpenCashDialog";
import { useStoreDayAction } from "./useStoreDayAction";

export function CashMovementDialog({
  open,
  onOpenChange,
  initialDirection,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDirection: CashMovementDirection;
  onSaved: () => void;
}) {
  const [direction, setDirection] = useState<CashMovementDirection>(initialDirection);
  const [type, setType] = useState(MOVEMENT_TYPES[initialDirection][0].value);
  const { state, pending, submit, reset } = useStoreDayAction(createCashMovementAction, () => {
    onOpenChange(false);
    onSaved();
  });
  const id = useId();

  function choose(next: CashMovementDirection) {
    setDirection(next);
    setType(MOVEMENT_TYPES[next][0].value);
  }

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={close} position="sheet" size="md">
      <DialogTitle close>Movimiento de caja</DialogTitle>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit(new FormData(event.currentTarget));
        }}
      >
        <input type="hidden" name="movement_type" value={type} />
        <DialogBody className="flex flex-col gap-4">
          {state.message && !state.ok ? <Alert variant="error">{state.message}</Alert> : null}
          <div role="radiogroup" aria-label="Dirección" className="grid grid-cols-2 gap-1 rounded-control bg-[#EEF0F4] p-1">
            {(["in", "out"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={direction === value}
                onClick={() => choose(value)}
                className={`min-h-10 rounded-[10px] text-sm font-semibold ${
                  direction === value ? "bg-app-surface text-text-strong shadow-sm" : "text-text-muted"
                }`}
              >
                {value === "in" ? "+ Entra dinero" : "− Sale dinero"}
              </button>
            ))}
          </div>
          {direction === "out" ? (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-semibold text-text-strong">Tipo</legend>
              <div className="flex flex-wrap gap-2">
                {MOVEMENT_TYPES.out.map((option) => (
                  <QuickChip key={option.value} active={type === option.value} onClick={() => setType(option.value)}>
                    {option.label}
                  </QuickChip>
                ))}
              </div>
              <FieldError message={state.fieldErrors.movement_type} />
            </fieldset>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-amount`} className="text-sm font-semibold text-text-strong">
              Monto (Bs)
            </label>
            <MoneyInput
              id={`${id}-amount`}
              name="amount"
              placeholder="0,00"
              required
              error={Boolean(state.fieldErrors.amount)}
              errorId={`${id}-amount-error`}
            />
            <FieldError id={`${id}-amount-error`} message={state.fieldErrors.amount} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-note`} className="text-sm font-semibold text-text-strong">
              Nota <span className="font-normal text-text-muted">(opcional)</span>
            </label>
            <Input
              id={`${id}-note`}
              name="note"
              maxLength={255}
              placeholder={direction === "in" ? "Ej. sencillo del banco" : "Ej. pago al proveedor de pan"}
              error={Boolean(state.fieldErrors.note)}
            />
            <FieldError message={state.fieldErrors.note} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => close(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} className="flex-1 sm:flex-none">
            {pending ? "Registrando…" : direction === "in" ? "Registrar entrada" : "Registrar salida"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
