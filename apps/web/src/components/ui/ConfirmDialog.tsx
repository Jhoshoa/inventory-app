"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogFooter } from "./Dialog";

interface ConfirmDialogProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  children?: ReactNode;
  triggerLabel?: string;
}

export function ConfirmDialog({
  title,
  description,
  triggerLabel,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {triggerLabel ? (
        <Button variant="ghost" onClick={() => setOpen(true)}>
          {triggerLabel}
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen} size="sm">
        <DialogTitle close>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
        {children ? <DialogBody>{children}</DialogBody> : null}
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
