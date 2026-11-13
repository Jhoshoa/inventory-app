"use client";

import { useId } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { formatTimeShort } from "@/lib/format/datetime";
import { reopenStoreDayAction } from "../actions";
import { useStoreDayAction } from "./useStoreDayAction";

export function ReopenDayDialog({
  open,
  onOpenChange,
  closedAt,
  onReopened,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closedAt: string | null;
  onReopened: () => void;
}) {
  const { state, pending, submit, reset } = useStoreDayAction(reopenStoreDayAction, () => {
    onOpenChange(false);
    onReopened();
  });
  const id = useId();

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={close} position="sheet" size="sm">
      <DialogTitle close>Reabrir la jornada de hoy</DialogTitle>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit(new FormData(event.currentTarget));
        }}
      >
        <DialogBody className="flex flex-col gap-3">
          {state.message && !state.ok ? <Alert variant="error">{state.message}</Alert> : null}
          <p className="text-sm text-text-muted">
            {closedAt ? `Se cerró a las ${formatTimeShort(closedAt)}. ` : ""}
            Al reabrir se puede volver a vender; el cierre anterior queda en el historial.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-note`} className="text-sm font-semibold text-text-strong">
              Nota <span className="font-normal text-text-muted">(opcional)</span>
            </label>
            <Input id={`${id}-note`} name="note" maxLength={255} error={Boolean(state.fieldErrors.note)} />
            <FieldError message={state.fieldErrors.note} />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => close(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Reabriendo…" : "Reabrir"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
