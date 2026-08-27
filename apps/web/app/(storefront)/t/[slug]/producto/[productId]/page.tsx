import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import {
  getPublicStorefront,
  getPublicStorefrontProduct,
  listPublicStorefrontProducts,
} from "@/features/storefront/api";
import { StorefrontImagePlaceholder } from "@/features/storefront/components/StorefrontImagePlaceholder";
import { StorefrontProductGrid } from "@/features/storefront/components/StorefrontProductGrid";
import { StorefrontShareButton } from "@/features/storefront/components/StorefrontShareButton";
import { formatCurrency } from "@/lib/format/currency";
import { storefrontWhatsappHref } from "@/features/storefront/whatsapp";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>;
}): Promise<Metadata> {
  const { slug, productId } = await params;
  const [store, product] = await Promise.all([
    getPublicStorefront(slug),
    getPublicStorefrontProduct(slug, productId),
  ]);
  if (!store || !product) return {};

  const title = `${product.name} - ${store.name}`;
  const description = `${formatCurrency(product.effective_price)} · ${product.available ? "Disponible" : "Agotado"} en ${store.name}`;
  const image = product.photo_url ?? store.logo_url ?? undefined;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function StorefrontProductPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>;
}) {
  const { slug, productId } = await params;
  const [store, product] = await Promise.all([
    getPublicStorefront(slug),
    getPublicStorefrontProduct(slug, productId),
  ]);

  if (!store || !product) notFound();

  const related = product.category_id
    ? await listPublicStorefrontProducts(slug, { categoryId: product.category_id, limit: 5 })
    : null;
  const relatedItems = (related?.items ?? []).filter((item) => item.id !== product.id).slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.photo_url ?? undefined,
    category: product.category ?? undefined,
    offers: {
      "@type": "Offer",
      price: product.effective_price,
      priceCurrency: "BOB",
      availability: product.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: store.name },
    },
  };

  return (
    <div className="space-y-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Miga de pan" className="flex flex-wrap items-center gap-1 text-sm text-text-muted">
        <Link href={`/t/${slug}`} className="inline-flex items-center gap-1 hover:text-text-strong">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Catalogo
        </Link>
        {product.category_id ? (
          <>
            <span>/</span>
            <Link href={`/t/${slug}?category=${product.category_id}`} className="hover:text-text-strong">
              {product.category}
            </Link>
          </>
        ) : null}
        <span>/</span>
        <span className="truncate text-text-body">{product.name}</span>
      </nav>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="aspect-square w-full overflow-hidden rounded-lg border border-app-border bg-app-surface-muted">
          {product.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen remota de producto, sin loader configurado
            <img src={product.photo_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <StorefrontImagePlaceholder colorPrimary={store.color_primary} iconClassName="h-16 w-16" />
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-semibold text-text-strong">{product.name}</h1>

          <div>
            <p
              className="text-3xl font-bold text-text-strong"
              style={store.color_primary ? { color: store.color_primary } : undefined}
            >
              {formatCurrency(product.effective_price)}
              <span className="ml-1 text-base font-normal text-text-muted">/ {product.unit}</span>
            </p>
            {product.effective_price !== product.price ? (
              <p className="text-sm text-text-disabled line-through">{formatCurrency(product.price)}</p>
            ) : null}
          </div>

          {product.available ? (
            product.low_stock ? (
              <p className="text-sm font-medium text-status-warning">Disponible &middot; ultimas unidades</p>
            ) : (
              <p className="text-sm font-medium text-status-success">Disponible</p>
            )
          ) : (
            <p className="text-sm font-medium text-status-danger">Agotado</p>
          )}

          <div className="flex flex-wrap gap-2">
            {store.whatsapp ? (
              <a
                href={storefrontWhatsappHref(
                  store.whatsapp,
                  `Hola, quiero consultar por "${product.name}" (${formatCurrency(product.effective_price)}) en ${store.name}`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-status-success px-4 py-2 text-sm font-medium text-text-inverse shadow-sm hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Consultar por WhatsApp
              </a>
            ) : null}
            <StorefrontShareButton
              title={product.name}
              text={`${product.name} - ${formatCurrency(product.effective_price)} en ${store.name}`}
            />
          </div>
        </div>
      </div>

      {relatedItems.length > 0 ? (
        <div className="space-y-3 pt-4">
          <h2 className="text-base font-semibold text-text-strong">Tambien te puede interesar</h2>
          <StorefrontProductGrid slug={slug} products={relatedItems} colorPrimary={store.color_primary} />
        </div>
      ) : null}
    </div>
  );
}
