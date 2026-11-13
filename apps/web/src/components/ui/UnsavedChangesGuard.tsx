"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * "¿Salir sin guardar?" (tablero P02). Con cambios sin guardar: avisa el navegador
 * al recargar o cerrar, y los enlaces de la app (barra lateral, pestañas, "Cancelar")
 * piden confirmar antes de irse.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${url.pathname}${url.search}${url.hash}`);
    }
    // En captura: antes que el Link de Next navegue.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  /** Para botones como "Cancelar": confirma si hay cambios, si no navega. */
  const leave = useCallback(
    (href: string) => {
      if (dirtyRef.current) setPendingHref(href);
      else router.push(href);
    },
    [router],
  );

  const dialog = (
    <ConfirmDialog
      open={pendingHref !== null}
      onOpenChange={(open) => !open && setPendingHref(null)}
      title="¿Salir sin guardar?"
      description="Los cambios que hiciste en este producto se pierden."
      cancelLabel="Seguir editando"
      confirmLabel="Salir sin guardar"
      onConfirm={() => {
        const href = pendingHref;
        dirtyRef.current = false;
        setPendingHref(null);
        if (href) router.push(href);
      }}
    />
  );

  return { leave, dialog };
}
