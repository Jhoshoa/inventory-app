"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { X } from "lucide-react";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";
type DialogPosition = "center" | "left" | "right" | "top" | "bottom";

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error(
      "Dialog compound components must be used within <Dialog>.",
    );
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-full",
};

const OVERLAY_POSITION: Record<DialogPosition, string> = {
  center: "flex items-center justify-center p-4",
  left: "flex items-stretch justify-start p-4 pl-0",
  right: "flex items-stretch justify-end p-4 pr-0",
  top: "flex items-start justify-center p-4 pt-0",
  bottom: "flex items-end justify-center p-4 pb-0",
};

const SURFACE_POSITION: Record<DialogPosition, string> = {
  center: "rounded-lg",
  left: "h-full w-full max-w-sm rounded-r-lg",
  right: "h-full w-full max-w-sm rounded-l-lg",
  top: "w-full rounded-b-lg",
  bottom: "w-full rounded-t-lg",
};

/* ------------------------------------------------------------------ */
/*  Root                                                              */
/* ------------------------------------------------------------------ */

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  size?: DialogSize;
  position?: DialogPosition;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  children,
  size = "md",
  position = "center",
  className,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /* ── Body scroll lock ──────────────────────────────────────── */

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* ── Escape key ────────────────────────────────────────────── */

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  /* ── Focus management ──────────────────────────────────────── */

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      surfaceRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [open]);

  /* ── Tab trap ──────────────────────────────────────────────── */

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const surface = surfaceRef.current;
      if (!surface) return;
      const els = surface.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const content = (
    <DialogContext.Provider
      value={{ open, onOpenChange, titleId, descriptionId, surfaceRef }}
    >
      {/* Overlay / backdrop */}
      <div
        onClick={() => onOpenChange(false)}
        className={cn(
          "fixed inset-0 z-50",
          "bg-black/50 backdrop-blur-sm",
          OVERLAY_POSITION[position],
        )}
      >
        {/* Surface */}
        <div
          ref={surfaceRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative flex max-h-full flex-col bg-app-surface outline-none",
            "border border-app-border shadow-floating",
            position === "center" ? SIZE_CLASSES[size] : "",
            SURFACE_POSITION[position],
            className,
          )}
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}

/* ------------------------------------------------------------------ */
/*  DialogTitle                                                       */
/* ------------------------------------------------------------------ */

interface DialogTitleProps {
  children: ReactNode;
  close?: boolean;
  className?: string;
}

export function DialogTitle({
  children,
  close = false,
  className,
}: DialogTitleProps) {
  const { titleId, onOpenChange } = useDialogContext();
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-5 pt-5 pb-0",
        className,
      )}
    >
      <h2 id={titleId} className="text-lg font-semibold text-text-strong">
        {children}
      </h2>
      {close && (
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-md p-1.5",
            "text-text-muted transition-colors",
            "hover:bg-app-surface-muted hover:text-text-strong",
          )}
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DialogDescription                                                 */
/* ------------------------------------------------------------------ */

interface DialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function DialogDescription({
  children,
  className,
}: DialogDescriptionProps) {
  const { descriptionId } = useDialogContext();
  return (
    <p
      id={descriptionId}
      className={cn("px-5 pt-2 text-sm text-text-muted", className)}
    >
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  DialogBody                                                        */
/* ------------------------------------------------------------------ */

interface DialogBodyProps {
  children: ReactNode;
  className?: string;
}

export function DialogBody({ children, className }: DialogBodyProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-5 pt-4 pb-0", className)}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DialogFooter                                                      */
/* ------------------------------------------------------------------ */

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
  align?: "start" | "center" | "end" | "between";
}

const FOOTER_ALIGN: Record<string, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

export function DialogFooter({
  children,
  className,
  align = "end",
}: DialogFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-5 pt-4 pb-5",
        FOOTER_ALIGN[align],
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DialogClose                                                       */
/* ------------------------------------------------------------------ */

interface DialogCloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

export function DialogClose({
  children,
  className,
  onClick,
  ...props
}: DialogCloseProps) {
  const { onOpenChange } = useDialogContext();
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(false);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1.5",
        "text-text-muted transition-colors",
        "hover:bg-app-surface-muted hover:text-text-strong",
        className,
      )}
      aria-label="Cerrar"
      {...props}
    >
      {children ?? <X className="h-4 w-4" />}
    </button>
  );
}
