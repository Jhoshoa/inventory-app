"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Button } from "./Button";

export function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  onValueChange,
  incrementDisabled = false,
  max,
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onValueChange?: (value: number) => void;
  incrementDisabled?: boolean;
  max?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(String(value));
    }
  }, [isEditing, value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextDraft = sanitizeQuantityInput(event.target.value);
    setDraft(nextDraft);

    if (!nextDraft) return;

    const parsed = Number(nextDraft);
    const nextQuantity = max ? Math.min(parsed, max) : parsed;
    setDraft(String(nextQuantity));
    onValueChange?.(nextQuantity);
  }

  function handleBlur() {
    setIsEditing(false);

    if (!draft) {
      setDraft(String(value));
    }
  }

  return (
    <div className="inline-flex items-center rounded-md border border-slate-300 bg-white">
      <Button
        className="h-8 w-8 rounded-r-none border-r border-slate-300 bg-slate-50 px-0 text-lg font-semibold leading-none text-slate-950 hover:bg-slate-100 disabled:text-slate-300"
        variant="ghost"
        onClick={onDecrement}
        aria-label="Disminuir cantidad"
      >
        <span aria-hidden="true">-</span>
      </Button>
      <input
        aria-label="Cantidad"
        className="h-8 min-w-10 border-0 bg-white px-2 text-center text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onBlur={handleBlur}
        onChange={handleChange}
        onFocus={() => setIsEditing(true)}
        style={{ width: `${Math.max(2, draft.length)}ch` }}
      />
      <Button
        className="h-8 w-8 rounded-l-none border-l border-slate-300 bg-slate-50 px-0 text-lg font-semibold leading-none text-slate-950 hover:bg-slate-100 disabled:text-slate-300"
        variant="ghost"
        onClick={onIncrement}
        disabled={incrementDisabled}
        aria-label="Aumentar cantidad"
      >
        <span aria-hidden="true">+</span>
      </Button>
    </div>
  );
}

function sanitizeQuantityInput(value: string) {
  return value.replace(/\D/g, "").replace(/^0+/, "");
}
