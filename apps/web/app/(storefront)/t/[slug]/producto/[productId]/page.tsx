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

      {/* En el celular la imagen no pasa de ~38% de la pantalla: nombre, precio y
          "Agregar" se ven sin bajar. Desde 768px, imagen cuadrada al lado (entre 640 y 768 la columna de
          la derecha quedaba muy angosta para los botones). */}
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 border-2 border-sf-ink bg-white p-3 text-sf-ink md:mt-5 md:grid-cols-2 md:gap-10 md:p-8">
        <div className="relative min-w-0">
          <div className="aspect-[4/3] max-h-[38vh] w-full overflow-hidden border-2 border-sf-ink md:aspect-square md:max-h-none">
            <ProductVisual product={product} fit="contain" textClassName="text-[72px] md:text-[96px]" />
          </div>
          <PriceSticker
            price={product.effective_price}
            className="absolute -bottom-3 right-3 h-16 w-16 rotate-[8deg] text-base md:-bottom-5 md:right-4 md:h-28 md:w-28 md:text-2xl"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 md:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {percent ? <DiscountTag percent={percent} className="border-[1.5px] border-[#111111] px-2 text-xs" /> : null}
            {product.category ? (
              <span className="border-[1.5px] border-[#111111] px-2 py-0.5 font-receipt text-xs font-bold">{product.category}</span>
            ) : null}
          </div>
          <h1 className="font-display text-[clamp(22px,4vw,48px)] uppercase leading-[0.95]">{product.name}</h1>
          <div>
            <p className="font-display text-2xl md:text-3xl">
              {formatCurrency(product.effective_price)}
              <span className="ml-1.5 font-archivo text-base font-normal text-sf-muted">/ {product.unit}</span>
            </p>
            {percent ? (
              <p className="mt-1 text-sm text-sf-ink md:text-base">
                Antes <span className="line-through decoration-[#FF4A1C] decoration-2">{formatCurrency(product.price)}</span>
                <span className="ml-2 font-semibold">
                  Ahorras {formatCurrency(Number(product.price) - Number(product.effective_price))}
                </span>
              </p>
            ) : null}
            {offerUntil ? <p className="mt-1 font-receipt text-[13px] font-bold uppercase">{offerUntil}</p> : null}
          </div>
          <p className="font-receipt text-[13px] font-bold">
            {product.available ? (product.low_stock ? "DISPONIBLE · ÚLTIMAS UNIDADES" : "DISPONIBLE") : "AGOTADO"}
          </p>
          <div className="md:max-w-sm">
            <CardBoletaButton product={product} size="large" />
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
                className="inline-flex min-w-[9rem] flex-1 items-center justify-center gap-2 rounded-full border-2 border-sf-ink bg-sf-sticker px-4 py-2.5 text-sm font-bold text-sf-onSticker hover:opacity-90 lg:flex-none"
              >
                <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {/* El texto largo solo donde la columna es ancha: una columna desde 400px, o dos desde 1024px. */}
                  <span className="hidden min-[400px]:inline md:hidden lg:inline">Consultar por </span>WhatsApp
                </span>
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
          <h2 className="font-display text-2xl uppercase">También te puede interesar</h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
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
