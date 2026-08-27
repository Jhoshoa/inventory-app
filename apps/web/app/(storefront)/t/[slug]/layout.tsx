import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicStorefront } from "@/features/storefront/api";
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
  return {
    title: store.name,
    description: store.description ?? `Catalogo de productos de ${store.name}`,
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
  };

  return (
    <div className="flex min-h-screen flex-col bg-app-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StorefrontHeader store={store} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-app-border py-4 text-center text-xs text-text-disabled">
        Catalogo generado con {process.env.NEXT_PUBLIC_APP_NAME || "TiendaStock"}
      </footer>
      {store.whatsapp ? <StorefrontFloatingContact whatsapp={store.whatsapp} storeName={store.name} /> : null}
    </div>
  );
}
