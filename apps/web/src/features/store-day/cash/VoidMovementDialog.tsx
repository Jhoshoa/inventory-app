"use client";

import { useId } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/format/currency";
import { voidCashMovementAction } from "../actions";
import { VOID_REASON_MAX_LENGTH } from "../schemas";
import type { CashMovement } from "../types";
import { movementWithArticle } from "./cashRegister";
import { useStoreDayAction } from "./useStoreDayAction";

export function VoidMovementDialog({
  movement,
  onOpenChange,
  onVoided,
}: {
  movement: CashMovement | null;
  onOpenChange: (open: boolean) => void;
  onVoided: () => void;
}) {
  const { state, pending, submit, reset } = useStoreDayAction(voidCashMovementAction, () => {
    onOpenChange(false);
    onVoided();
  });
  const id = useId();

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  if (!movement) return null;

  return (
    <Dialog open onOpenChange={close} position="sheet" size="sm">
      <DialogTitle close>
        ¿Anular {movementWithArticle(movement.movement_type)} de {formatCurrency(movement.amount)}?
      </DialogTitle>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit(new FormData(event.currentTarget));
        }}
      >
        <input type="hidden" name="movement_id" value={movement.id} />
        <DialogBody className="flex flex-col gap-3">
          {state.message && !state.ok ? <Alert variant="error">{state.message}</Alert> : null}
          <p className="text-sm text-text-muted">
            El movimiento queda en la lista como anulado y deja de contar en el efectivo esperado.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-reason`} className="text-sm font-semibold text-text-strong">
              Razón
            </label>
            <Input
              id={`${id}-reason`}
              name="void_reason"
              required
              maxLength={VOID_REASON_MAX_LENGTH}
              placeholder="Ej. monto mal escrito"
              error={Boolean(state.fieldErrors.void_reason)}
              errorId={`${id}-reason-error`}
            />
            <FieldError id={`${id}-reason-error`} message={state.fieldErrors.void_reason} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => close(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "Anulando…" : "Anular movimiento"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
