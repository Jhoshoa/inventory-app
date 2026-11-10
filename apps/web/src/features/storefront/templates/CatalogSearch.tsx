"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type { StorefrontSort } from "../settings";
import { catalogHref } from "./catalogData";
import { useCatalogNavigation } from "./CatalogNavigation";

/** Pausa al escribir antes de buscar: no se busca con cada letra. */
export const SEARCH_DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 2;

/**
 * Buscador del catalogo: busca solo al dejar de escribir y con el boton (o
 * la tecla "Buscar" del teclado del celular), sin recargar la pagina. Sin
 * JavaScript sigue funcionando como formulario normal.
 */
export function CatalogSearch({
  slug,
  q,
  category,
  sort,
  defaultSort,
  placeholder,
  formClassName,
  inputClassName,
  buttonClassName,
}: {
  slug: string;
  q?: string;
  category?: string;
  sort: StorefrontSort;
  defaultSort: StorefrontSort;
  placeholder: string;
  formClassName: string;
  inputClassName: string;
  buttonClassName: string;
}) {
  const navigation = useCatalogNavigation();
  const [value, setValue] = useState(q ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSearched = useRef(q ?? "");

  // Si la busqueda cambia por fuera (p. ej. "Ver toda la lista"), el campo la
  // sigue. Si es la que este campo pidio, no: el cliente pudo seguir escribiendo.
  useEffect(() => {
    if ((q ?? "") === lastSearched.current) return;
    setValue(q ?? "");
    lastSearched.current = q ?? "";
  }, [q]);

  function search(term: string, options: { replace?: boolean } = {}) {
    const trimmed = term.trim();
    if (trimmed === lastSearched.current) return;
    lastSearched.current = trimmed;
    navigation?.navigate(catalogHref(slug, { q: trimmed || undefined, category, sort, defaultSort }), options);
  }

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.length < MIN_QUERY_LENGTH) return;
    // Mientras escribe se reemplaza la URL: "atras" no recorre cada letra.
    const timeout = window.setTimeout(() => search(value, { replace: true }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
    // search depende de props que ya estan en la URL; solo importa el texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!navigation) return;
    event.preventDefault();
    search(value);
    // Cierra el teclado del celular para que se vean los resultados.
    inputRef.current?.blur();
  }

  return (
    <form action={`/t/${slug}`} role="search" onSubmit={onSubmit} className={formClassName}>
      {category ? <input type="hidden" name="category" value={category} /> : null}
      {sort !== defaultSort ? <input type="hidden" name="sort" value={sort} /> : null}
      <label htmlFor="storefront-search" className="sr-only">
        {placeholder.replace("…", "")}
      </label>
      <input
        ref={inputRef}
        id="storefront-search"
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        className={inputClassName}
      />
      <button type="submit" aria-label="Buscar" className={buttonClassName}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}
