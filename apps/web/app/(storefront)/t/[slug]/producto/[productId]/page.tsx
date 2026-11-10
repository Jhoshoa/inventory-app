import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import {
  getPublicStorefront,
  getPublicStorefrontProduct,
  listPublicStorefrontProducts,
} from "@/features/storefront/api";
import { CardBoletaButton } from "@/features/storefront/templates/BoletaControls";
import { DiscountTag, PriceSticker, ProductVisual, discountPercent, offerUntilLabel } from "@/features/storefront/templates/shared";
import { VitrinaCard } from "@/features/storefront/templates/Vitrina";
import { StorefrontShareButton } from "@/features/storefront/components/StorefrontShareButton";
import { formatCurrency } from "@/lib/format/currency";
import { storefrontWhatsappHref } from "@/features/storefront/whatsapp";
import type { PublicStorefrontProduct } from "@/features/storefront/types";

const RELATED_LIMIT = 4;

/** Productos relacionados: prioriza la misma categoria, y completa (o
 * reemplaza, si el producto no tiene categoria) con productos en oferta que
 * esten disponibles — asi la seccion siempre tiene algo relevante que
 * mostrar, en vez de desaparecer para productos sin categoria asignada. */
async function getRelatedProducts(
  slug: string,
  product: PublicStorefrontProduct,
): Promise<PublicStorefrontProduct[]> {
  const [sameCategory, onSale] = await Promise.all([
    product.category_id
      ? listPublicStorefrontProducts(slug, { categoryId: product.category_id, limit: RELATED_LIMIT + 1 })
      : Promise.resolve(null),
    listPublicStorefrontProducts(slug, { onSale: true, limit: RELATED_LIMIT + 1 }),
  ]);

  const candidates = [...(sameCategory?.items ?? []), ...(onSale?.items ?? [])];
  const seen = new Set<string>([product.id]);
  const related: PublicStorefrontProduct[] = [];

  for (const item of candidates) {
    if (seen.has(item.id) || !item.available) continue;
    seen.add(item.id);
    related.push(item);
    if (related.length === RELATED_LIMIT) break;
  }

  return related;
}

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

  const relatedItems = await getRelatedProducts(slug, product);

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

  const isList = store.settings.template === "lista";
  const percent = product.available ? discountPercent(product) : null;
  const offerUntil = percent ? offerUntilLabel(product.discount_ends_at, store.timezone) : null;

  return (
    <div className={`mx-auto max-w-[1240px] px-4 pb-12 pt-5 sm:px-6 ${isList ? "text-sf-onPrimary" : ""}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Miga de pan" className="flex flex-wrap items-center gap-1.5 font-receipt text-[13px] font-bold">
        <Link href={`/t/${slug}`} className="inline-flex items-center gap-1.5 hover:opacity-70">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {store.name.toUpperCase()}
        </Link>
        {product.category_id && !isList ? (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/t/${slug}?category=${product.category_id}`} className="hover:opacity-70">
              {product.category?.toUpperCase()}
            </Link>
          </>
        ) : null}
      </nav>

      <div className="mt-5 grid gap-6 border-2 border-sf-ink bg-white p-4 text-sf-ink sm:grid-cols-2 sm:gap-10 sm:p-8">
        <div className="relative">
          <div className="aspect-square w-full overflow-hidden border-2 border-sf-ink">
            <ProductVisual product={product} textClassName="text-[96px]" />
          </div>
          <PriceSticker
            price={product.effective_price}
            className="absolute -bottom-5 right-4 h-24 w-24 rotate-[8deg] text-2xl sm:h-28 sm:w-28"
          />
        </div>

        <div className="flex flex-col gap-4 pt-4 sm:pt-0">
          <div className="flex flex-wrap items-center gap-2">
            {percent ? <DiscountTag percent={percent} className="border-[1.5px] border-[#111111] px-2 text-xs" /> : null}
            {product.category ? (
              <span className="border-[1.5px] border-[#111111] px-2 py-0.5 font-receipt text-xs font-bold">{product.category}</span>
            ) : null}
          </div>
          <h1 className="font-display text-[clamp(28px,4vw,48px)] uppercase leading-[0.95]">{product.name}</h1>
          <div>
            <p className="font-display text-3xl">
              {formatCurrency(product.effective_price)}
              <span className="ml-1.5 font-archivo text-base font-normal text-sf-muted">/ {product.unit}</span>
            </p>
            {percent ? (
              <p className="mt-1 text-base text-sf-ink">
                Antes <span className="line-through decoration-[#FF4A1C] decoration-2">{formatCurrency(product.price)}</span>
                <span className="ml-2 font-semibold">
                  Ahorras {formatCurrency(Number(product.price) - Number(product.effective_price))}
                </span>
              </p>
            ) : null}
            {offerUntil ? <p className="mt-1 font-receipt text-[13px] font-bold uppercase">{offerUntil}</p> : null}
          </div>
          <p className="font-receipt text-[13px] font-bold">
            {product.available ? (product.low_stock ? "DISPONIBLE · ULTIMAS UNIDADES" : "DISPONIBLE") : "AGOTADO"}
          </p>
          <div className="max-w-sm">
            <CardBoletaButton product={product} />
          </div>
          <div className="flex flex-wrap gap-2">
            {store.whatsapp ? (
              <a
                href={storefrontWhatsappHref(
                  store.whatsapp,
                  `Hola, quiero consultar por "${product.name}" (${formatCurrency(product.effective_price)}) en ${store.name}`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border-2 border-sf-ink bg-sf-sticker px-4 py-2.5 text-sm font-bold text-sf-onSticker hover:opacity-90"
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
        <section className="mt-10 space-y-4">
          <h2 className="font-display text-2xl uppercase">Tambien te puede interesar</h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-5">
            {relatedItems.map((item) => (
              <li key={item.id}>
                <VitrinaCard slug={slug} product={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
