"use client";

import { useEffect } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export function DialogOverlay({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-text-strong/40 p-4 ${className}`}>
      {children}
    </div>
  );
}

export function DialogSurface({
  titleId,
  onClose,
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  titleId?: string;
  onClose?: () => void;
}) {
  const { containerRef } = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onClose) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    }

    el.addEventListener("keydown", handleEscape);
    return () => el.removeEventListener("keydown", handleEscape);
  }, [onClose, containerRef]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={`rounded-lg border border-app-border bg-app-surface p-5 shadow-floating outline-none ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
