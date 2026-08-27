"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/format/currency";
import type { PublicStorefrontProduct } from "../types";

export function StorefrontFeaturedCarousel({
  slug,
  products,
  colorPrimary,
}: {
  slug: string;
  products: PublicStorefrontProduct[];
  colorPrimary?: string | null;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  function scrollBy(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * (track.clientWidth * 0.85), behavior: "smooth" });
  }

  return (
    <section aria-label="Ofertas destacadas" className="relative">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-strong">Ofertas destacadas</h2>
        {products.length > 2 ? (
          <div className="hidden gap-1 sm:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Anterior"
              className="rounded-full border border-app-border bg-app-surface p-1.5 text-text-body hover:bg-app-surface-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Siguiente"
              className="rounded-full border border-app-border bg-app-surface p-1.5 text-text-body hover:bg-app-surface-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => {
          const discountPercent =
            product.discount_type === "percentage"
              ? Number(product.discount_value)
              : Math.round((1 - Number(product.effective_price) / Number(product.price)) * 100);
          return (
            <Link
              key={product.id}
              href={`/t/${slug}/producto/${product.id}`}
              className="group relative w-40 shrink-0 snap-start overflow-hidden rounded-lg border border-app-border bg-app-surface shadow-panel sm:w-48"
            >
              <span
                className="absolute left-2 top-2 z-10 rounded-full bg-status-danger px-2 py-0.5 text-xs font-semibold text-text-inverse"
                style={colorPrimary ? { backgroundColor: colorPrimary } : undefined}
              >
                -{discountPercent}%
              </span>
              <div className="aspect-square w-full bg-app-surface-muted">
                {product.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- imagen remota de producto, sin loader configurado
                  <img
                    src={product.photo_url}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-text-disabled">
                    Sin foto
                  </div>
                )}
              </div>
              <div className="space-y-0.5 p-2.5">
                <p className="truncate text-sm font-medium text-text-strong">{product.name}</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-sm font-semibold text-text-strong">
                    {formatCurrency(product.effective_price)}
                  </p>
                  <p className="text-xs text-text-disabled line-through">{formatCurrency(product.price)}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
