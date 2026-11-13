"use client";

import { useRouter } from "next/navigation";
import { useCatalogNavigation } from "../templates/CatalogNavigation";
import { STOREFRONT_SORTS, STOREFRONT_SORT_LABELS, type StorefrontSort } from "../settings";

const OPTIONS = STOREFRONT_SORTS.map((value) => ({ value, label: STOREFRONT_SORT_LABELS[value] }));

export function StorefrontSortSelect({
  slug,
  q,
  categoryId,
  sort,
  defaultSort = "name",
  className = "flex shrink-0 items-center gap-2 text-sm text-text-muted",
  selectClassName = "rounded-md border border-app-borderStrong bg-app-surface px-2.5 py-2 text-sm text-text-body outline-none focus:ring-2 focus:ring-focus",
}: {
  slug: string;
  q?: string;
  categoryId?: string;
  sort: StorefrontSort;
  /** El orden que la tienda eligio: no se escribe en la URL. */
  defaultSort?: StorefrontSort;
  /** Estilos de la plantilla del catalogo. */
  className?: string;
  selectClassName?: string;
}) {
  const router = useRouter();
  const navigation = useCatalogNavigation();

  function handleChange(next: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("category", categoryId);
    if (next !== defaultSort) params.set("sort", next);
    const qs = params.toString();
    const href = `/t/${slug}${qs ? `?${qs}` : ""}`;
    // Dentro del catalogo: sin recargar ni subir al principio.
    if (navigation) navigation.navigate(href);
    else router.push(href);
  }

  return (
    <label className={className}>
      <span className="hidden sm:inline">Ordenar</span>
      {/* En el celular "Ordenar" no se ve: el nombre va en la lista misma. */}
      <select
        aria-label="Ordenar"
        value={sort}
        onChange={(e) => handleChange(e.target.value)}
        className={selectClassName}
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
