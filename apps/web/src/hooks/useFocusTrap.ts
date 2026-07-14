"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T>(null);
  const triggerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    triggerRef.current = previouslyFocused;

    function focusFirst() {
      const elements = Array.from(container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (elements.length > 0) {
        elements[0].focus();
      } else {
        container!.focus();
      }
    }

    focusFirst();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        container!.dispatchEvent(new CustomEvent("dialogEscape", { bubbles: true }));
        return;
      }

      if (event.key !== "Tab") return;

      const elements = Array.from(container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (elements.length === 0) {
        event.preventDefault();
        container!.focus();
        return;
      }

      const first = elements[0];
      const last = elements.at(-1)!;

      if (!container!.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);

      const restoreTarget = triggerRef.current;
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus();
      }
    };
  }, [active]);

  return { containerRef, triggerRef };
}
