"use client";

import { useId, useState } from "react";
import { Button } from "./Button";
import { DialogOverlay, DialogSurface } from "./Dialog";

export function ConfirmDialog({
  title,
  description,
  triggerLabel,
  confirmLabel,
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  triggerLabel: string;
  confirmLabel: string;
  onConfirm: (close: () => void) => void;
  children?: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  function close() {
    setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
    );
  }

  return (
    <DialogOverlay>
      <DialogSurface titleId={titleId} onClose={close} className="w-full max-w-md">
        <div className="space-y-2">
          <h2 id={titleId} className="text-base font-semibold text-text-strong">
            {title}
          </h2>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
        {children ? (
          <div className="mt-5 space-y-3">{children(close)}</div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => onConfirm(close)}>
            {confirmLabel}
          </Button>
        </div>
      </DialogSurface>
    </DialogOverlay>
  );
}
