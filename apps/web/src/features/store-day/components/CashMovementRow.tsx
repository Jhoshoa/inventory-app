"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/format/currency";
import { voidCashMovementAction } from "../actions";
import type { CashMovement } from "../types";
import { cashMovementLabel, initialState } from "../utils/store-day-helpers";

export function CashMovementRow({ movement }: { movement: CashMovement }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const nextState = await voidCashMovementAction(initialState, new FormData(event.currentTarget));
      if (nextState.ok) {
        toast.success("Movimiento anulado");
        router.refresh();
      } else {
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
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="movement_id" value={movement.id} />
        <Input
          aria-label="Razon de anulacion"
          name="void_reason"
          placeholder="Razon (opcional)"
          className="h-9 w-40 text-xs"
        />
        <Button type="submit" variant="secondary" disabled={isSubmitting}>
          {isSubmitting ? "Anulando..." : "Anular"}
        </Button>
      </form>
    </div>
  );
}
