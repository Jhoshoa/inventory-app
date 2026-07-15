"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Button } from "./Button";

export function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  onValueChange,
  incrementDisabled = false,
  min = 1,
  max,
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onValueChange?: (value: number) => void;
  incrementDisabled?: boolean;
  min?: number;
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
    const clamped = Math.max(min, max ? Math.min(parsed, max) : parsed);
    if (clamped !== parsed) setDraft(String(clamped));
    onValueChange?.(clamped);
  }

  function handleBlur() {
    setIsEditing(false);

    if (!draft || Number(draft) < min) {
      setDraft(String(value >= min ? value : min));
    }
  }

  function handleDecrement() {
    if (value > min) onDecrement();
  }

  return (
    <div className="inline-flex items-center rounded-md border border-app-borderStrong bg-app-surface">
      <Button
        className="h-8 w-8 rounded-r-none border-r border-app-borderStrong bg-app-surface-muted px-0 text-lg font-semibold leading-none text-text-strong hover:bg-app-surface-muted disabled:text-text-disabled"
        variant="ghost"
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label="Disminuir cantidad"
      >
        <span aria-hidden="true">-</span>
      </Button>
      <input
        aria-label="Cantidad"
        className="h-8 min-w-10 border-0 bg-app-surface px-2 text-center text-sm font-medium text-text-strong outline-none focus:ring-2 focus:ring-inset focus:ring-focus"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onBlur={handleBlur}
        onChange={handleChange}
        onFocus={() => setIsEditing(true)}
        style={{ width: `${Math.max(2, draft.length)}ch` }}
      />
      <Button
        className="h-8 w-8 rounded-l-none border-l border-app-borderStrong bg-app-surface-muted px-0 text-lg font-semibold leading-none text-text-strong hover:bg-app-surface-muted disabled:text-text-disabled"
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
