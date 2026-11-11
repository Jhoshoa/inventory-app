"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

const MenuContext = createContext<{ close: (focusTrigger?: boolean) => void } | null>(null);

/**
 * Menú de acciones (botón ⋯ de las tablas). Se monta fuera de la tarjeta para que
 * el `overflow-hidden` de la tabla no lo corte; se abre hacia arriba si no entra.
 */
export function Menu({
  label,
  trigger,
  triggerClassName = "",
  children,
}: {
  /** Nombre accesible del botón, p. ej. "Más acciones de Leche Pil 1l". */
  label: string;
  trigger: ReactNode;
  triggerClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    setPosition(null);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const height = menuRef.current?.offsetHeight ?? 0;
    const below = rect.bottom + 4;
    const top = below + height > window.innerHeight - 8 && rect.top - height - 4 > 8 ? rect.top - height - 4 : below;
    setPosition({ top, right: Math.max(8, window.innerWidth - rect.right) });
  }, [open]);

  useEffect(() => {
    if (position) menuItems(menuRef.current)[0]?.focus();
  }, [position]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close();
    }
    const onViewportChange = () => close();
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, close]);

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = menuItems(menuRef.current);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      close();
    }
  }

  const menu = open ? (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label={label}
      onKeyDown={onMenuKeyDown}
      style={position ? { top: position.top, right: position.right } : { top: 0, right: 0, visibility: "hidden" }}
      className="fixed z-50 w-56 rounded-card border border-app-border bg-app-surface p-1.5 shadow-floating"
    >
      <MenuContext.Provider value={{ close }}>{children}</MenuContext.Provider>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`inline-flex items-center justify-center rounded-control border border-app-borderStrong bg-app-surface font-extrabold text-text-body hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-focus ${triggerClassName}`}
      >
        {trigger}
      </button>
      {menu && typeof document !== "undefined"
        ? createPortal(menu, document.querySelector(".theme-app") ?? document.body)
        : null}
    </>
  );
}

const itemClass =
  "flex min-h-10 w-full items-center rounded-control px-2.5 text-left text-sm font-semibold focus:outline-none focus-visible:bg-app-surface-muted hover:bg-app-surface-muted";

export function MenuItem({
  href,
  download = false,
  onSelect,
  tone = "default",
  className: extraClass = "",
  children,
}: {
  /** P. ej. "lg:hidden" para una acción que en pantallas anchas ya es un botón. */
  className?: string;
  href?: string;
  /** Archivo (CSV): enlace normal, no navegación de Next. */
  download?: boolean;
  onSelect?: () => void;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  const context = useContext(MenuContext);
  const className = `${itemClass} ${tone === "danger" ? "text-status-danger" : "text-text-strong"} ${extraClass}`;

  if (href && download) {
    return (
      <a role="menuitem" tabIndex={-1} href={href} download className={className} onClick={() => context?.close()}>
        {children}
      </a>
    );
  }
  if (href) {
    return (
      <Link role="menuitem" tabIndex={-1} href={href} className={className} onClick={() => context?.close()}>
        {children}
      </Link>
    );
  }
  return (
    <button
      role="menuitem"
      tabIndex={-1}
      type="button"
      className={className}
      onClick={() => {
        context?.close();
        onSelect?.();
      }}
    >
      {children}
    </button>
  );
}

function menuItems(menu: HTMLElement | null) {
  // Los ocultos por tamaño de pantalla (display: none) no reciben foco.
  return menu
    ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter((item) => getComputedStyle(item).display !== "none")
    : [];
}
