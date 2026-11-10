"use client";

import { type MouseEvent, useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/Dialog";
import { CatalogLink } from "./CatalogNavigation";

export interface CategoryOption {
  id: string;
  name: string;
  count: number;
  /** Vitrina: URL filtrada. Lista: ancla "#cat-..." dentro de la pagina. */
  href: string;
  active?: boolean;
}

/** En el celular, mas de estas categorias pasan a un boton con una lista. */
export const MOBILE_CHIP_LIMIT = 4;
/** En pantallas grandes se ven estas como chips y el resto en "+N mas". */
export const DESKTOP_CHIP_LIMIT = 7;
/** Con mas de estas, la lista trae un buscador. */
const FILTER_FROM = 10;

interface CategoryPickerProps {
  items: CategoryOption[];
  /** "Todos" de la Vitrina (filtra); la Lista no lo usa (son anclas). */
  allItem?: { href: string; active: boolean };
  /** "link": cambia el filtro del catalogo. "anchor": baja a la seccion. */
  mode: "link" | "anchor";
  variant: "vitrina" | "lista";
  /** El dialogo se monta en <body>, fuera de los colores y fuentes de la tienda. */
  themeVars: Record<string, string>;
  fontClassName: string;
}

/**
 * Categorias del catalogo sin ocupar media pantalla en el celular: hasta 4
 * se muestran como chips (en varias lineas, sin scroll horizontal); con mas,
 * un boton abre la lista. En pantallas grandes, chips y "+N mas" pasadas 7.
 */
export function CategoryPicker(props: CategoryPickerProps) {
  const { items, allItem, variant } = props;
  const [open, setOpen] = useState(false);
  const activeItem = items.find((item) => item.active);
  const compactOnMobile = items.length > MOBILE_CHIP_LIMIT;
  const hidden = items.length > DESKTOP_CHIP_LIMIT + 1 ? items.slice(DESKTOP_CHIP_LIMIT) : [];
  const visible = hidden.length > 0 ? items.slice(0, DESKTOP_CHIP_LIMIT) : items;
  // La activa siempre a la vista, aunque este entre las escondidas.
  const visibleDesktop =
    activeItem && hidden.includes(activeItem) ? [...visible.slice(0, -1), activeItem] : visible;
  const hiddenCount = items.length - visibleDesktop.length;

  const chip =
    variant === "vitrina"
      ? "inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-sf-ink px-3 py-[7px] text-[13px] font-bold sm:px-4 sm:py-2.5 sm:text-sm"
      : "inline-flex items-center gap-1 border-2 border-sf-ink px-3 py-2 font-receipt text-[13px] font-bold";
  const chipState = (active?: boolean) =>
    active ? "bg-sf-ink text-white" : variant === "vitrina" ? "bg-white text-sf-ink" : "text-sf-ink hover:bg-sf-paper";

  return (
    <>
      {compactOnMobile ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={`flex w-full items-center justify-between gap-2 border-2 border-sf-ink bg-white px-4 py-2.5 text-left text-sm font-bold text-sf-ink sm:hidden ${
            variant === "vitrina" ? "rounded-full" : "font-receipt"
          }`}
        >
          <span className="min-w-0 truncate">
            <span className="sr-only">Categoria: </span>
            {activeItem?.name ?? "Categorias"}
          </span>
          <span className="flex shrink-0 items-center font-receipt text-xs text-sf-muted">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
      ) : null}

      <nav
        aria-label="Categorias"
        className={`flex-wrap gap-1.5 sm:gap-2 ${compactOnMobile ? "hidden sm:flex" : "flex"}`}
      >
        {allItem ? (
          <ChipLink mode={props.mode} href={allItem.href} active={allItem.active} className={`${chip} ${chipState(allItem.active)}`}>
            Todos
          </ChipLink>
        ) : null}
        {/* En el celular (si no es compacto) se ven todas; en pantalla grande, hasta 7. */}
        {items.map((item) => {
          const onDesktop = visibleDesktop.includes(item);
          return (
            <ChipLink
              key={item.id}
              mode={props.mode}
              href={item.href}
              active={item.active}
              className={`${chip} ${chipState(item.active)} ${onDesktop ? "" : "sm:hidden"}`}
            >
              {item.name}
              <span className="font-receipt text-xs opacity-75">
                {variant === "lista" ? "· " : ""}
                {item.count}
              </span>
            </ChipLink>
          );
        })}
        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className={`${chip} hidden border-dashed bg-transparent text-sf-ink hover:bg-white sm:inline-flex`}
          >
            +{hiddenCount} mas
          </button>
        ) : null}
      </nav>

      <CategorySheet {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ChipLink({
  mode,
  href,
  active,
  className,
  onNavigate,
  children,
}: {
  mode: "link" | "anchor";
  href: string;
  active?: boolean;
  className: string;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  if (mode === "link") {
    return (
      <span onClickCapture={onNavigate} className="contents">
        <CatalogLink href={href} aria-current={active ? "page" : undefined} className={className}>
          {children}
        </CatalogLink>
      </span>
    );
  }
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!onNavigate) return;
    // Primero cierra la hoja (devuelve el scroll de la pagina) y despues baja.
    event.preventDefault();
    onNavigate();
    window.setTimeout(() => {
      document.getElementById(href.slice(1))?.scrollIntoView({ block: "start" });
      history.replaceState(null, "", href);
    }, 0);
  }
  return (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}

function CategorySheet({
  items,
  allItem,
  mode,
  themeVars,
  fontClassName,
  open,
  onClose,
}: CategoryPickerProps & { open: boolean; onClose: () => void }) {
  const [filter, setFilter] = useState("");
  const term = filter.trim().toLowerCase();
  const shown = term ? items.filter((item) => item.name.toLowerCase().includes(term)) : items;

  function close() {
    setFilter("");
    onClose();
  }

  const row = "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-semibold";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? null : close())}
      position="bottom"
      className="max-h-[80vh] overflow-hidden !rounded-t-3xl !border-0 !bg-transparent !shadow-none sm:mx-auto sm:mb-6 sm:max-w-md sm:!rounded-3xl"
    >
      <div
        data-storefront
        style={themeVars}
        className={`${fontClassName} flex max-h-[80vh] flex-col rounded-t-3xl border-2 border-b-0 border-[#111111] bg-white font-archivo text-sf-ink sm:rounded-3xl sm:border-b-2`}
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
          {/* El cn del Dialog solo concatena: "!" para ganarle a su padding. */}
          <DialogTitle className="!p-0">
            <span className="font-display text-xl font-normal uppercase text-sf-ink">Categorias</span>
          </DialogTitle>
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-sf-ink text-lg font-bold"
          >
            ×
          </button>
        </div>
        {items.length > FILTER_FROM ? (
          <div className="px-4 pb-2">
            <label htmlFor="category-filter" className="sr-only">
              Buscar categoria
            </label>
            <input
              id="category-filter"
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Buscar categoria…"
              enterKeyHint="search"
              className="w-full rounded-full border-2 border-sf-ink px-4 py-2.5 text-base outline-none transition-shadow focus:shadow-[3px_3px_0_var(--sf-ink)]"
            />
          </div>
        ) : null}
        <ul className="flex-1 divide-y divide-dashed divide-sf-line overflow-y-auto pb-4">
          {allItem && !term ? (
            <li>
              <ChipLink mode={mode} href={allItem.href} active={allItem.active} onNavigate={close} className={`${row} ${allItem.active ? "bg-sf-ink text-white" : "hover:bg-sf-paper"}`}>
                <span>Todas</span>
              </ChipLink>
            </li>
          ) : null}
          {shown.map((item) => (
            <li key={item.id}>
              <ChipLink
                mode={mode}
                href={item.href}
                active={item.active}
                onNavigate={close}
                className={`${row} ${item.active ? "bg-sf-ink text-white" : "hover:bg-sf-paper"}`}
              >
                <span className="min-w-0 truncate">{item.name}</span>
                <span className="shrink-0 font-receipt text-[13px] opacity-75">{item.count}</span>
              </ChipLink>
            </li>
          ))}
          {shown.length === 0 ? <li className="px-4 py-6 text-center text-sm text-sf-muted">Ninguna categoria con ese nombre.</li> : null}
        </ul>
      </div>
    </Dialog>
  );
}
