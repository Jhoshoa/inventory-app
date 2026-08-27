import Link from "next/link";
import { formatCurrency } from "@/lib/format/currency";
import { EmptyState } from "@/components/ui/EmptyState";
import { StorefrontImagePlaceholder } from "./StorefrontImagePlaceholder";
import type { PublicStorefrontProduct } from "../types";

export function StorefrontProductGrid({
  slug,
  products,
  colorPrimary,
  emptyTitle = "Todavia no hay productos publicados",
  emptyDescription = "Esta tienda no tiene productos visibles en su catalogo por el momento.",
}: {
  slug: string;
  products: PublicStorefrontProduct[];
  colorPrimary?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (products.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => {
        const onSale = product.effective_price !== product.price;
        const discountPercent = onSale
          ? product.discount_type === "percentage"
            ? Math.round(Number(product.discount_value))
            : Math.round((1 - Number(product.effective_price) / Number(product.price)) * 100)
          : 0;

        return (
          <Link
            key={product.id}
            href={`/t/${slug}/producto/${product.id}`}
            className="group relative overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-panel transition-shadow hover:shadow-floating"
          >
            {onSale ? (
              <span
                className="absolute left-2 top-2 z-10 rounded-full bg-status-danger px-2 py-0.5 text-xs font-semibold text-text-inverse"
                style={colorPrimary ? { backgroundColor: colorPrimary } : undefined}
              >
                -{discountPercent}%
              </span>
            ) : null}
            {!product.available ? (
              <span className="absolute right-2 top-2 z-10 rounded-full bg-app-surface/90 px-2 py-0.5 text-xs font-medium text-text-muted shadow-sm">
                Agotado
              </span>
            ) : product.low_stock ? (
              <span className="absolute right-2 top-2 z-10 rounded-full bg-status-warningBg px-2 py-0.5 text-xs font-medium text-status-warning shadow-sm">
                Ultimas unidades
              </span>
            ) : null}
            <div className="aspect-square w-full bg-app-surface-muted">
              {product.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- imagen remota de producto, sin loader configurado
                <img
                  src={product.photo_url}
                  alt={product.name}
                  loading="lazy"
                  className={`h-full w-full object-cover transition-transform group-hover:scale-105 ${!product.available ? "opacity-60" : ""}`}
                />
              ) : (
                <StorefrontImagePlaceholder colorPrimary={colorPrimary} />
              )}
            </div>
            <div className="space-y-1 p-3">
              {product.category ? (
                <p className="truncate text-xs text-text-disabled">{product.category}</p>
              ) : null}
              <p className="truncate text-sm font-medium text-text-strong">{product.name}</p>
              <p
                className="text-sm font-semibold text-text-strong"
                style={colorPrimary ? { color: colorPrimary } : undefined}
              >
                {formatCurrency(product.effective_price)}
                {onSale ? (
                  <span className="ml-1.5 text-xs font-normal text-text-disabled line-through">
                    {formatCurrency(product.price)}
                  </span>
                ) : null}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
