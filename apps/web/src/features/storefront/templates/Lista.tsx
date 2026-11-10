import { Pagination } from "@/components/ui/Pagination";
import { formatCurrency } from "@/lib/format/currency";
import { StorefrontOpenStatus } from "../components/StorefrontOpenStatus";
import { categoryTint, facebookUrl, hoursSummary, instagramUrl, tiktokUrl } from "../settings";
import type { PublicStorefront, PublicStorefrontProduct } from "../types";
import { storefrontWhatsappHref } from "../whatsapp";
import { RowBoletaButton } from "./BoletaControls";
import { type CatalogPageData, catalogHref, catalogSections } from "./catalogData";
import { StoreLogo } from "./shared";

interface ProductGroup {
  id: string;
  name: string;
  items: PublicStorefrontProduct[];
}

/** Agrupa por categoria, en el orden de las categorias de la tienda; lo sin categoria va al final. */
function groupProducts(products: PublicStorefrontProduct[], categories: CatalogPageData["categories"]): ProductGroup[] {
  const byCategory = new Map<string, PublicStorefrontProduct[]>();
  const loose: PublicStorefrontProduct[] = [];
  for (const product of products) {
    if (product.category_id) {
      const list = byCategory.get(product.category_id) ?? [];
      list.push(product);
      byCategory.set(product.category_id, list);
    } else {
      loose.push(product);
    }
  }
  const groups: ProductGroup[] = categories
    .filter((category) => byCategory.has(category.id))
    .map((category) => ({ id: `cat-${category.id}`, name: category.name, items: byCategory.get(category.id) ?? [] }));
  // Productos con una categoria que no vino en la lista (p. ej. inactiva) tambien se muestran.
  for (const [categoryId, items] of byCategory) {
    if (!categories.some((category) => category.id === categoryId)) {
      groups.push({ id: `cat-${categoryId}`, name: items[0]?.category ?? "Otros", items });
    }
  }
  if (loose.length > 0) groups.push({ id: "cat-otros", name: "Otros", items: loose });
  return groups;
}

/** Plantilla "Lista de precios": una boleta larga, agrupada por categoria. */
export function ListaCatalog(data: CatalogPageData) {
  const { store, slug, productList, q, sort, defaultSort, offset, pageSize } = data;
  const sections = catalogSections(store);
  const groups = groupProducts(productList.items, data.categories);
  const hours = store.settings.hours ? hoursSummary(store.settings.hours) : null;
  const address = store.settings.show_contact ? store.settings.address : null;
  const subline = [hours?.toUpperCase(), address?.toUpperCase()].filter(Boolean).join(" · ");

  return (
    <div className="pb-6">
      <ListaHeader store={store} showPayment={sections.payment} showContact={sections.contact} />

      <main id="lista" className="mx-auto mt-6 max-w-[820px] px-3 sm:px-4">
        <div className="relative border-2 border-b-0 border-sf-ink bg-white px-[clamp(16px,5vw,56px)] pb-8 pt-12 text-sf-ink">
          <div className="absolute -top-[26px] right-4 flex h-[88px] w-[88px] rotate-12 items-center justify-center rounded-full border-2 border-sf-ink bg-sf-sticker text-center font-display text-xs leading-[1.05] text-sf-onSticker sm:right-6 sm:h-[104px] sm:w-[104px] sm:text-sm">
            PEDIDOS
            <br />
            POR
            <br />
            WHATSAPP
          </div>
          <div className="text-center">
            <StoreLogo store={store} className="mx-auto h-24 w-24 border-[3px]" textClassName="text-[34px]" />
            <h1 className="mt-[18px] break-words font-display text-[clamp(34px,6vw,72px)] uppercase leading-[0.95]">{store.name}</h1>
            {store.description ? <p className="mt-2.5 text-lg text-[#475569]">{store.description}</p> : null}
            <div className="mt-3.5 font-receipt text-[13px] leading-[1.8]">
              <p>LISTA DE PRECIOS · ACTUALIZADA HOY</p>
              {subline ? <p>{subline}</p> : null}
              {store.settings.hours ? (
                <StorefrontOpenStatus hours={store.settings.hours} timezone={store.timezone} className="justify-center font-bold" />
              ) : null}
            </div>
          </div>

          <div className="mb-5 mt-7 border-t-2 border-dashed border-sf-ink" />
          <form action={`/t/${slug}`} className="flex items-center gap-2.5 border-2 border-dashed border-sf-ink px-4">
            {sort !== defaultSort ? <input type="hidden" name="sort" value={sort} /> : null}
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <label htmlFor="storefront-search" className="sr-only">
              Buscar en la lista
            </label>
            <input
              id="storefront-search"
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar en la lista…"
              className="min-w-0 flex-1 bg-transparent py-3.5 font-receipt text-[15px] text-sf-ink outline-none"
            />
          </form>
          {q ? (
            <p className="mt-3 font-receipt text-[13px]">
              {productList.total} resultado{productList.total === 1 ? "" : "s"} para &quot;{q}&quot; ·{" "}
              <a href={catalogHref(slug, { sort, defaultSort })} className="font-bold underline">
                Ver toda la lista
              </a>
            </p>
          ) : null}
          {groups.length > 1 ? (
            <nav aria-label="Categorias" className="mt-4 flex flex-wrap gap-2 font-receipt text-[13px] font-bold">
              {groups.map((group) => (
                <a key={group.id} href={`#${group.id}`} className="border-2 border-sf-ink px-3 py-2 text-sf-ink hover:bg-sf-paper">
                  {group.name} · {group.items.length}
                </a>
              ))}
            </nav>
          ) : null}

          {groups.length === 0 ? (
            <p className="mt-10 border-2 border-dashed border-sf-ink p-10 text-center font-receipt">
              {q ? "No encontramos productos con esa busqueda." : "Todavia no hay productos en la lista."}
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.id} id={group.id} className="mt-10 scroll-mt-4">
                <div className="flex items-center gap-3">
                  <h2
                    className="inline-block -rotate-[1.5deg] border-2 border-sf-ink px-3.5 py-1.5 font-display text-lg uppercase text-[#111111] sm:text-xl"
                    style={{ backgroundColor: categoryTint(group.name) }}
                  >
                    {group.name}
                  </h2>
                  <span aria-hidden="true" className="flex-1 border-t-2 border-dashed border-sf-ink" />
                  <span className="shrink-0 font-receipt text-[13px]">{group.items.length} ITEMS</span>
                </div>
                <ul className="mt-3.5 font-receipt text-[14px] sm:text-[15px]">
                  {group.items.map((product) => (
                    <ListaRow key={product.id} slug={slug} product={product} />
                  ))}
                </ul>
              </section>
            ))
          )}

          <div className="mb-4 mt-10 border-t-2 border-dashed border-sf-ink" />
          <div className="flex justify-between font-receipt text-[15px] font-bold">
            <span>TOTAL DE PRODUCTOS</span>
            <span>{productList.total}</span>
          </div>
          {productList.total > pageSize ? (
            <div className="mt-6">
              <Pagination
                basePath={`/t/${slug}`}
                searchParams={new URLSearchParams(catalogHref(slug, { q, sort, defaultSort }).split("?")[1] ?? "")}
                total={productList.total}
                limit={pageSize}
                offset={offset}
              />
            </div>
          ) : null}
          <div
            aria-hidden="true"
            className="mx-auto mb-2 mt-6 h-14 max-w-[360px]"
            style={{
              background:
                "repeating-linear-gradient(90deg, #111111 0 2px, transparent 2px 4px, #111111 4px 5px, transparent 5px 8px, #111111 8px 11px, transparent 11px 12px, #111111 12px 13px, transparent 13px 17px, #111111 17px 19px, transparent 19px 20px)",
            }}
          />
          <p className="text-center font-receipt text-[13px]">*** GRACIAS POR SU PREFERENCIA ***</p>
        </div>
        <div aria-hidden="true" className="receipt-edge h-4 bg-white" />

        {sections.payment || sections.contact ? (
          <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5 text-sf-ink">
            {sections.payment ? <ListaPayCard store={store} /> : null}
            {sections.contact ? <ListaContactCard store={store} /> : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function ListaRow({ slug, product }: { slug: string; product: PublicStorefrontProduct }) {
  const out = !product.available;
  const onSale = product.effective_price !== product.price;
  return (
    <li className="flex items-center gap-2.5 border-b border-[#E2E8F0] py-2">
      <a
        href={`/t/${slug}/producto/${product.id}`}
        className={`min-w-0 hover:underline ${out ? "text-[#64748B] line-through" : "text-sf-ink"}`}
      >
        {product.name}
      </a>
      {product.available && product.low_stock ? (
        <span className="shrink-0 bg-sf-ink px-1.5 py-0.5 text-[11px] font-bold text-white">ULTIMAS</span>
      ) : null}
      <span aria-hidden="true" className="min-w-4 flex-1 translate-y-1 border-b-2 border-dotted border-[#94A3B8]" />
      <span className={`shrink-0 text-right font-bold ${out ? "text-[#64748B]" : ""}`}>
        {formatCurrency(product.effective_price)}
        {onSale ? <span className="block text-[11px] font-normal text-[#64748B] line-through">{formatCurrency(product.price)}</span> : null}
      </span>
      <RowBoletaButton product={product} />
    </li>
  );
}

function ListaHeader({ store, showPayment, showContact }: { store: PublicStorefront; showPayment: boolean; showContact: boolean }) {
  const link = "px-3 py-3 font-bold text-sf-onPrimary hover:opacity-80";
  return (
    <header className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-sf-onPrimary sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <StoreLogo store={store} className="h-11 w-11 border-2" textClassName="text-base" />
        <span className="truncate font-display text-lg uppercase">{store.name}</span>
      </div>
      <nav aria-label="Secciones" className="flex flex-wrap items-center gap-1 text-[15px]">
        <a href="#lista" className={`${link} hidden sm:inline`}>
          Lista de precios
        </a>
        {showPayment ? (
          <a href="#pagar" className={`${link} hidden sm:inline`}>
            Como pagar
          </a>
        ) : null}
        {showContact ? (
          <a href="#contacto" className={`${link} hidden sm:inline`}>
            Contacto
          </a>
        ) : null}
        {store.whatsapp ? (
          <a
            href={storefrontWhatsappHref(store.whatsapp, `Hola, quiero consultar por sus productos en ${store.name}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border-2 border-sf-ink bg-sf-sticker px-[18px] py-2.5 font-bold text-sf-onSticker hover:opacity-90"
          >
            Escribenos
          </a>
        ) : null}
      </nav>
    </header>
  );
}

function ListaPayCard({ store }: { store: PublicStorefront }) {
  return (
    <div id="pagar" className="scroll-mt-4 border-2 border-sf-ink bg-white p-6">
      <p className="font-receipt text-xs font-bold">COMO PAGAR</p>
      <div className="mt-3.5 flex items-center gap-4">
        {store.payment_qr_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagen remota (Cloudinary), sin loader configurado
          <img src={store.payment_qr_url} alt="QR de pago de la tienda" className="h-24 w-24 shrink-0 border-2 border-dashed border-[#94A3B8] object-contain" />
        ) : null}
        <p className="text-[15px] leading-normal">
          {store.payment_instructions ?? "Paga con QR y envia el comprobante por WhatsApp."}
        </p>
      </div>
    </div>
  );
}

function ListaContactCard({ store }: { store: PublicStorefront }) {
  const { settings } = store;
  const hours = settings.hours ? hoursSummary(settings.hours) : null;
  const socials = [
    settings.facebook ? { label: "Facebook", href: facebookUrl(settings.facebook) } : null,
    settings.instagram ? { label: "Instagram", href: instagramUrl(settings.instagram) } : null,
    settings.tiktok ? { label: "TikTok", href: tiktokUrl(settings.tiktok) } : null,
  ].filter((social) => social !== null);
  return (
    <div id="contacto" className="scroll-mt-4 border-2 border-sf-ink bg-white p-6 text-[15px] leading-[1.7]">
      <p className="font-receipt text-xs font-bold">CONTACTO</p>
      <div className="mt-2.5">
        {store.whatsapp ? (
          <p>
            WhatsApp:{" "}
            <a
              href={storefrontWhatsappHref(store.whatsapp, `Hola, quiero consultar por sus productos en ${store.name}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-sf-ink hover:underline"
            >
              +{store.whatsapp}
            </a>
          </p>
        ) : null}
        {settings.address || settings.maps_url ? (
          <p>
            {settings.address}
            {settings.address && settings.maps_url ? " · " : ""}
            {settings.maps_url ? (
              <a href={settings.maps_url} target="_blank" rel="noopener noreferrer nofollow" className="font-bold text-sf-ink hover:underline">
                Ver mapa
              </a>
            ) : null}
          </p>
        ) : null}
        {hours ? <p>{hours}</p> : null}
        {socials.length > 0 ? (
          <p className="flex flex-wrap gap-x-3">
            {socials.map((social) => (
              <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer nofollow" className="font-bold text-sf-ink hover:underline">
                {social.label}
              </a>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  );
}
