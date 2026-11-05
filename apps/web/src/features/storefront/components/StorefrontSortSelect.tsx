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
}: {
  slug: string;
  q?: string;
  categoryId?: string;
  sort: StorefrontSort;
  /** El orden que la tienda eligio: no se escribe en la URL. */
  defaultSort?: StorefrontSort;
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
    <label className="flex shrink-0 items-center gap-2 text-sm text-text-muted">
      <span className="hidden sm:inline">Ordenar por</span>
      <select
        value={sort}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-app-borderStrong bg-app-surface px-2.5 py-2 text-sm text-text-body outline-none focus:ring-2 focus:ring-focus"
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
