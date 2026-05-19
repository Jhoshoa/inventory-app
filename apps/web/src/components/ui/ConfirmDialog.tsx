"use client";

import { useState } from "react";
import { Button } from "./Button";
import { DialogSurface } from "./Dialog";

export function ConfirmDialog({
  title,
  description,
  triggerLabel,
  confirmLabel,
  children,
}: {
  title: string;
  description: string;
  triggerLabel: string;
  confirmLabel: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <DialogSurface className="w-full max-w-md">
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <div className="mt-5 space-y-3">{children(() => setOpen(false))}</div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <span className="sr-only">{confirmLabel}</span>
        </div>
      </DialogSurface>
    </div>
  );
}
