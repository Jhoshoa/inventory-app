"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/dashboard/products", label: "Productos" },
  { href: "/dashboard/products/categorias", label: "Categorías" },
  { href: "/dashboard/products/lugares", label: "Lugares en la tienda" },
] as const;

/**
 * Pestañas Productos · Categorías · Lugares en la tienda (tablero P01B), desde 640 px.
 * En el celular no hay pestañas: se entra desde el ⋯ de Productos. Solo para el dueño.
 */
export function ProductSectionTabs() {
  const pathname = usePathname() ?? "";
  const current = SECTIONS.find((section) => section.href !== SECTIONS[0].href && pathname.startsWith(section.href))?.href ?? SECTIONS[0].href;

  return (
    <nav aria-label="Secciones de productos" className="flex gap-1 border-b border-app-border max-sm:hidden">
      {SECTIONS.map((section) => {
        const active = section.href === current;
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px inline-flex h-10 items-center whitespace-nowrap border-b-2 px-3.5 text-sm ${
              active
                ? "border-brand-700 font-bold text-text-strong"
                : "border-transparent font-semibold text-text-muted hover:text-text-strong"
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
