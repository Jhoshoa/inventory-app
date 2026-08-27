"use client";

import { useRouter } from "next/navigation";
import type { StorefrontSort } from "../api";

const OPTIONS: Array<{ value: StorefrontSort; label: string }> = [
  { value: "name", label: "Nombre (A-Z)" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
];

export function StorefrontSortSelect({
  slug,
  q,
  categoryId,
  sort,
}: {
  slug: string;
  q?: string;
  categoryId?: string;
  sort: StorefrontSort;
}) {
  const router = useRouter();

  function handleChange(next: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("category", categoryId);
    if (next !== "name") params.set("sort", next);
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
