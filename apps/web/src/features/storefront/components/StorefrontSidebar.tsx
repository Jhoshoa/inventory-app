import Link from "next/link";
import type { PublicStorefrontCategory } from "../types";

function categoryHref(slug: string, categoryId?: string, q?: string) {
  const params = new URLSearchParams();
  if (categoryId) params.set("category", categoryId);
  if (q) params.set("q", q);
  const qs = params.toString();
  return `/t/${slug}${qs ? `?${qs}` : ""}`;
}

export function StorefrontSidebar({
  slug,
  categories,
  activeCategoryId,
  q,
  colorPrimary,
}: {
  slug: string;
  categories: PublicStorefrontCategory[];
  activeCategoryId?: string;
  q?: string;
  colorPrimary?: string | null;
}) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Categorias" className="lg:w-56 lg:shrink-0">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-muted lg:px-3">
        Categorias
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        <CategoryLink
          href={categoryHref(slug, undefined, q)}
          label="Todos"
          active={!activeCategoryId}
          colorPrimary={colorPrimary}
        />
        {categories.map((category) => (
          <CategoryLink
            key={category.id}
            href={categoryHref(slug, category.id, q)}
            label={category.name}
            count={category.product_count}
            active={activeCategoryId === category.id}
            colorPrimary={colorPrimary}
          />
        ))}
      </div>
    </nav>
  );
}

function CategoryLink({
  href,
  label,
  count,
  active,
  colorPrimary,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
  colorPrimary?: string | null;
}) {
  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors lg:rounded-md lg:border-transparent lg:px-3 lg:py-2 ${
        active
          ? "border-transparent bg-app-surface-muted font-medium text-text-strong"
          : "border-app-border text-text-body hover:bg-app-surface-muted"
      }`}
      style={active && colorPrimary ? { color: colorPrimary } : undefined}
    >
      <span className="truncate">{label}</span>
      {count !== undefined ? (
        <span className="shrink-0 text-xs text-text-disabled">{count}</span>
      ) : null}
    </Link>
  );
}
