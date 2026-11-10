import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicStorefront } from "@/features/storefront/api";
import { StorefrontBoletaProvider } from "@/features/storefront/boleta";
import { storefrontTheme, themeStyle } from "@/features/storefront/settings";
import { BoletaBar } from "@/features/storefront/templates/BoletaDock";
import { boletaStoreOf } from "@/features/storefront/templates/catalogData";
import { MadeWithPill } from "@/features/storefront/templates/shared";
import { publicFontVariables } from "@/lib/fonts";

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
  const theme = storefrontTheme(store);
  const isList = theme.template === "lista";

  return (
    <StorefrontBoletaProvider slug={slug}>
      <div
        className={`${publicFontVariables} flex min-h-screen flex-col overflow-x-clip font-archivo text-sf-ink ${
          isList ? "bg-sf-primary" : "bg-sf-paper"
        }`}
        style={themeStyle(theme)}
      >
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {announcement ? (
          <div
            role="note"
            className="border-b-2 border-sf-ink bg-sf-sticker px-4 py-2.5 text-center font-receipt text-[11px] font-bold uppercase tracking-[0.06em] text-sf-onSticker sm:text-[13px]"
          >
            <p className="mx-auto max-w-5xl break-words">★ {announcement} ★</p>
          </div>
        ) : null}
        <main className="flex-1">{children}</main>
        <footer
          className={`mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-4 px-4 py-8 text-sm sm:px-6 ${
            isList ? "justify-center text-sf-onPrimary" : "justify-between text-sf-muted"
          }`}
        >
          {isList ? null : (
            <span>
              © {new Date().getFullYear()} {store.name}
            </span>
          )}
          <MadeWithPill />
        </footer>
        <BoletaBar
          store={boletaStoreOf(slug, store)}
          variant={theme.template}
          themeVars={themeStyle(theme)}
          fontClassName={publicFontVariables}
        />
      </div>
    </StorefrontBoletaProvider>
  );
}
