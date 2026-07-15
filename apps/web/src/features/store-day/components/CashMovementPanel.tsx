"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createCashMovementAction } from "../actions";
import type { CashMovementListResult, StoreDayActionState } from "../types";
import { CashMovementRow } from "./CashMovementRow";
import { initialState, sanitizeMoneyInput } from "./store-day-helpers";

export function CashMovementPanel({ cashMovements }: { cashMovements?: CashMovementListResult }) {
  const [state, setState] = useState<StoreDayActionState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setState(initialState);
    try {
      const nextState = await createCashMovementAction(initialState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        event.currentTarget.reset();
        toast.success("Movimiento registrado");
        router.refresh();
      } else {
        toast.error(nextState.message || "No se pudo registrar el movimiento");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo registrar el movimiento.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-app-border bg-app-surface-muted p-3">
      <p className="text-sm font-semibold text-text-strong">Movimientos de caja</p>
      <form onSubmit={onSubmit} className="grid gap-2">
        <Select aria-label="Tipo de movimiento" name="movement_type" defaultValue="expense">
          <option value="expense">Gasto</option>
          <option value="cash_in">Entrada</option>
          <option value="cash_out">Salida</option>
          <option value="deposit">Deposito</option>
          <option value="withdrawal">Retiro</option>
        </Select>
        <FieldError message={state.fieldErrors.movement_type} />
        <Input
          aria-label="Monto de movimiento"
          inputMode="decimal"
          name="amount"
          onInput={sanitizeMoneyInput}
          pattern="\d+(\.\d{1,2})?"
          placeholder="Monto"
          required
          title="Use solo numeros con maximo 2 decimales"
        />
        <FieldError message={state.fieldErrors.amount} />
        <Input aria-label="Nota de movimiento" name="note" maxLength={255} placeholder="Nota opcional" />
        <FieldError message={state.fieldErrors.note} />
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Registrando..." : "Registrar movimiento"}</Button>
      </form>
      <CashMovementList cashMovements={cashMovements} />
    </div>
  );
}

function CashMovementList({ cashMovements }: { cashMovements?: CashMovementListResult }) {
  if (!cashMovements) return null;
  if (!cashMovements.ok) return <DataFetchError resource="los movimientos" error={cashMovements.error.message} />;
  if (cashMovements.data.items.length === 0) {
    return <p className="text-sm text-text-muted">Sin movimientos de caja.</p>;
  }
  return (
    <div className="space-y-2">
      {cashMovements.data.items.slice(0, 5).map((movement) => (
        <CashMovementRow key={movement.id} movement={movement} />
      ))}
    </div>
  );
}
