import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { ProductSectionTabs } from "./ProductSectionTabs";

/**
 * Encabezado de Categorías y Lugares en la tienda (tablero P01B). En el celular
 * "‹ Productos" vuelve a la lista; desde 640 px van las pestañas de Productos.
 */
export function ProductsSubpageHeader({
  title,
  summary,
  action,
}: {
  title: string;
  summary?: string | null;
  /** Botón "+ Nueva…" desde 640 px (en el celular va abajo de la lista). */
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <header className="flex items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0">
          <Link
            href="/dashboard/products"
            className="-ml-1 mb-1 inline-flex min-h-9 items-center gap-0.5 rounded-[10px] pr-2 text-[13px] font-semibold text-text-muted hover:text-text-strong sm:hidden"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Productos
          </Link>
          {/* Como en el tablero: en el celular el título es la sección; desde 640 px es
              "Productos" y la pestaña marca la sección (el lector oye "Productos · Categorías"). */}
          <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">
            <span className="sm:hidden">{title}</span>
            <span className="max-sm:hidden">
              Productos<span className="sr-only"> · {title}</span>
            </span>
          </h1>
          {summary ? <p className="text-sm text-text-muted">{summary}</p> : null}
        </div>
        {action ? <div className="max-sm:hidden">{action}</div> : null}
      </header>
      <ProductSectionTabs />
    </div>
  );
}
