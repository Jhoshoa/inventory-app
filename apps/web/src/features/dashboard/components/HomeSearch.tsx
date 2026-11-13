"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { MIN_PRODUCT_SEARCH_LENGTH } from "@/features/products/schemas";

/** Buscador de Inicio: Enter abre Productos con la búsqueda; Ctrl K (o ⌘K) lo enfoca. */
export function HomeSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [hint, setHint] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form
      role="search"
      className="relative w-full sm:w-80"
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        if (query.length < MIN_PRODUCT_SEARCH_LENGTH) {
          setHint(`Escribe al menos ${MIN_PRODUCT_SEARCH_LENGTH} letras`);
          return;
        }
        router.push(`/dashboard/products?q=${encodeURIComponent(query)}`);
      }}
    >
      <label className="flex h-[42px] items-center gap-2 rounded-control border border-app-borderStrong bg-app-surface px-3 focus-within:ring-2 focus-within:ring-focus">
        <Search className="h-[18px] w-[18px] shrink-0 text-text-muted" aria-hidden="true" />
        <span className="sr-only">Buscar productos</span>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (hint) setHint("");
          }}
          placeholder="Buscar productos por nombre o código…"
          aria-describedby={hint ? "home-search-hint" : undefined}
          className="min-w-0 flex-1 bg-transparent text-sm text-text-strong outline-none placeholder:text-text-disabled"
        />
        <kbd className="hidden rounded-md border border-app-border px-1.5 py-0.5 text-[11px] text-text-muted sm:inline">Ctrl K</kbd>
      </label>
      {hint ? (
        <p id="home-search-hint" role="status" className="absolute mt-1 text-xs text-status-warning">
          {hint}
        </p>
      ) : null}
    </form>
  );
}
