"use client";

import { useRouter } from "next/navigation";
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

  function handleChange(next: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("category", categoryId);
    if (next !== defaultSort) params.set("sort", next);
    const qs = params.toString();
    router.push(`/t/${slug}${qs ? `?${qs}` : ""}`);
  }

  return (
    <label className={className}>
      <span className="hidden sm:inline">Ordenar</span>
      <select
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
