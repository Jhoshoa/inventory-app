import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicStorefront } from "@/features/storefront/api";
import { StorefrontBoletaProvider } from "@/features/storefront/boleta";
import { StorefrontBoleta } from "@/features/storefront/components/StorefrontBoleta";
import { StorefrontAnnouncement } from "@/features/storefront/components/StorefrontAnnouncement";
import { StorefrontFloatingContact } from "@/features/storefront/components/StorefrontFloatingContact";
import { StorefrontHeader } from "@/features/storefront/components/StorefrontHeader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStorefront(slug);
  if (!store) return {};

  const description = store.description ?? `Catalogo de productos de ${store.name}`;
  const image = store.banner_url ?? store.logo_url ?? undefined;

  return {
    title: store.name,
    description,
    openGraph: {
      type: "website",
      title: store.name,
      description,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: store.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getPublicStorefront(slug);
  if (!store) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    description: store.description ?? undefined,
    image: store.logo_url ?? undefined,
    telephone: store.whatsapp ?? undefined,
    address: store.settings.show_contact && store.settings.address ? store.settings.address : undefined,
  };
  const announcement = store.settings.announcement_enabled ? store.settings.announcement_text : null;

  return (
    <StorefrontBoletaProvider slug={slug}>
    {/* Con la barra de la boleta abierta, el pie deja lugar para que no la tape. */}
    <div className="flex min-h-screen flex-col bg-app-background [[data-boleta]_&]:pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {announcement ? <StorefrontAnnouncement text={announcement} color={store.color_primary} /> : null}
      <StorefrontHeader store={store} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-app-border py-4 text-center text-xs text-text-disabled">
        Catalogo generado con {process.env.NEXT_PUBLIC_APP_NAME || "TiendaStock"}
      </footer>
      {store.whatsapp ? <StorefrontFloatingContact whatsapp={store.whatsapp} storeName={store.name} /> : null}
      <StorefrontBoleta
        slug={slug}
        storeName={store.name}
        storeWhatsapp={store.whatsapp}
        paymentQrUrl={store.payment_qr_url}
        paymentInstructions={store.payment_instructions}
        pickupEnabled={store.settings.pickup_enabled}
        deliveryEnabled={store.settings.delivery_enabled}
        colorPrimary={store.color_primary}
      />
    </div>
    </StorefrontBoletaProvider>
  );
}
