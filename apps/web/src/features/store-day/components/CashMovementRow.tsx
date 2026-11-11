"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/format/currency";
import { voidCashMovementAction } from "../actions";
import { VOID_REASON_MAX_LENGTH } from "../schemas";
import type { CashMovement } from "../types";
import { cashMovementLabel, initialState } from "../utils/store-day-helpers";

export function CashMovementRow({ movement }: { movement: CashMovement }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reasonError, setReasonError] = useState("");
  const router = useRouter();
  const reasonErrorId = useId();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const nextState = await voidCashMovementAction(initialState, new FormData(event.currentTarget));
      setReasonError(nextState.fieldErrors.void_reason ?? "");
      if (nextState.ok) {
        toast.success("Movimiento anulado");
        router.refresh();
      } else if (!nextState.fieldErrors.void_reason) {
        toast.error(nextState.message || "No se pudo anular el movimiento");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo anular el movimiento.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-app-surface p-2 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-text-strong">{cashMovementLabel(movement.movement_type)}</p>
        <p className={movement.direction === "in" ? "text-status-success" : "text-status-danger"}>
          {movement.direction === "in" ? "+" : "-"}{formatCurrency(movement.amount)}
        </p>
        {movement.note ? <p className="text-xs text-text-muted">{movement.note}</p> : null}
      </div>
      <form onSubmit={onSubmit} noValidate className="flex flex-wrap items-start gap-2">
        <input type="hidden" name="movement_id" value={movement.id} />
        <div className="flex flex-col gap-1">
          <Input
            aria-label="Razón de anulación"
            name="void_reason"
            placeholder="Razón (obligatoria)"
            maxLength={VOID_REASON_MAX_LENGTH}
            required
            aria-invalid={reasonError ? true : undefined}
            aria-describedby={reasonError ? reasonErrorId : undefined}
            onChange={() => reasonError && setReasonError("")}
            className="h-9 w-48 text-xs"
          />
          <FieldError id={reasonErrorId} message={reasonError} />
        </div>
        <Button type="submit" variant="secondary" disabled={isSubmitting}>
          {isSubmitting ? "Anulando..." : "Anular"}
        </Button>
      </form>
    </div>
  );
}
