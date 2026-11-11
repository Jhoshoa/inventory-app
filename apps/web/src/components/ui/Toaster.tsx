"use client";

import { useSyncExternalStore } from "react";
import { Toaster as SonnerToaster } from "sonner";

const PHONE_QUERY = "(max-width: 639px)";

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// Avisos cortos (tablero P14): arriba en escritorio; en el celular abajo,
// por encima de la barra de pestañas. 4 segundos.
export function Toaster() {
  const isPhone = useSyncExternalStore(
    subscribe,
    () => typeof window.matchMedia === "function" && window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
  return (
    <SonnerToaster
      position={isPhone ? "bottom-center" : "top-right"}
      mobileOffset={{ bottom: 96 }}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        className: "text-sm",
      }}
    />
  );
}
