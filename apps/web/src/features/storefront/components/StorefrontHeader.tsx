import { MessageCircle } from "lucide-react";
import type { PublicStorefront } from "../types";
import { storefrontWhatsappHref } from "../whatsapp";

export function StorefrontHeader({ store }: { store: PublicStorefront }) {
  const accentStyle = store.color_primary ? { backgroundColor: store.color_primary } : undefined;

  return (
    <header className="relative border-b border-app-border">
      {store.banner_url ? (
        <div className="relative h-40 w-full overflow-hidden sm:h-56">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen remota de la tienda, sin loader configurado */}
          <img src={store.banner_url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        </div>
      ) : (
        <div
          className={`h-24 w-full sm:h-32 ${store.color_primary ? "" : "bg-gradient-to-br from-brand-800 to-brand-600"}`}
          style={store.color_primary ? { backgroundColor: store.color_primary } : undefined}
        />
      )}

      <div className="mx-auto max-w-5xl px-4">
        <div className={`flex flex-col gap-4 sm:flex-row sm:items-end ${store.banner_url ? "-mt-10 sm:-mt-14" : "-mt-8 sm:-mt-10"}`}>
          {store.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen remota de la tienda, sin loader configurado
            <img
              src={store.logo_url}
              alt={store.name}
              className="h-20 w-20 shrink-0 rounded-2xl border-4 border-app-background bg-app-surface object-cover shadow-floating sm:h-24 sm:w-24"
            />
          ) : (
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-app-background bg-brand-700 text-2xl font-semibold text-text-inverse shadow-floating sm:h-24 sm:w-24"
              style={accentStyle}
            >
              {store.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1 pb-1">
            <h1 className="text-xl font-bold text-text-strong sm:text-2xl">{store.name}</h1>
            {store.description ? (
              <p className="mt-1 max-w-2xl text-sm text-text-muted">{store.description}</p>
            ) : null}
          </div>

          {store.whatsapp ? (
            <a
              href={storefrontWhatsappHref(store.whatsapp, `Hola, quiero consultar por sus productos en ${store.name}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-1 inline-flex shrink-0 items-center gap-2 rounded-full bg-status-success px-4 py-2.5 text-sm font-medium text-text-inverse shadow-panel transition-transform hover:scale-[1.03] hover:opacity-95"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Contactar
            </a>
          ) : null}
        </div>
        <div className="h-4" />
      </div>
    </header>
  );
}
