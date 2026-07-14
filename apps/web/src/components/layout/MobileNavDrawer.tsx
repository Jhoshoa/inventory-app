"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { UserRole } from "@/lib/auth/types";
import { isNavItemActive, visibleNavItems } from "./navigation";

export function MobileNavDrawer({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const triggerButton = triggerButtonRef.current;

    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        firstElement.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);

      const restoreTarget = triggerButton ?? previouslyFocusedElement;
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        ref={triggerButtonRef}
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-body hover:bg-app-surface-muted hover:text-text-strong focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 lg:hidden"
        aria-label="Abrir menú de navegación"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && isMounted ? createPortal(
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-text-strong/40"
            aria-label="Cerrar menú de navegación"
            onClick={() => setIsOpen(false)}
          />
          <aside
            ref={dialogRef}
            className="fixed inset-y-0 left-0 z-10 flex w-80 max-w-[85vw] flex-col overflow-y-auto border-r border-app-border bg-app-surface shadow-floating"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            tabIndex={-1}
          >
            <div className="flex h-16 items-center justify-between border-b border-app-border px-5">
              <Link href="/dashboard" className="text-base font-semibold text-text-strong">
                App Inventario
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-body hover:bg-app-surface-muted hover:text-text-strong focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
                aria-label="Cerrar menú"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Principal móvil">
              {visibleNavItems(role).map((item) => {
                const Icon = item.icon;
                const isActive = isNavItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-700 text-text-inverse shadow-sm"
                        : "text-text-body hover:bg-brand-50 hover:text-brand-700"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-text-inverse" : "text-text-muted group-hover:text-brand-600"}`} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
