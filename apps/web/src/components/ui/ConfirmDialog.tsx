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
  pendingLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void | Promise<void>;
  children?: ReactNode;
  triggerLabel?: string;
  /** Abierta desde afuera (p. ej. un menú o "Desactivar…" de otra ventana); sin botón propio. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ConfirmDialog({
  title,
  description,
  triggerLabel,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  pendingLabel,
  variant = "danger",
  onConfirm,
  children,
  open: controlledOpen,
  onOpenChange,
}: ConfirmDialogProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = (next: boolean) => {
    setLocalOpen(next);
    onOpenChange?.(next);
  };
  const [isPending, setIsPending] = useState(false);

  async function handleConfirm() {
    if (isPending) return;
    setIsPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      // Deja el dialogo abierto para que el usuario reintente; el llamador
      // es responsable de mostrar su propio mensaje de error (toast, etc.).
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      {triggerLabel ? (
        <Button variant="ghost" onClick={() => setOpen(true)}>
          {triggerLabel}
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={(next) => !isPending && setOpen(next)} size="sm">
        <DialogTitle close={!isPending}>{title}</DialogTitle>
        {description ? (
          <DialogDescription>{description}</DialogDescription>
        ) : null}
        {children ? <DialogBody>{children}</DialogBody> : null}
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={() => void handleConfirm()} disabled={isPending}>
            {isPending ? pendingLabel ?? "Procesando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
