import Link from "next/link";
import { Pagination } from "@/components/ui/Pagination";
import { formatCurrency } from "@/lib/format/currency";
import { StorefrontOpenStatus } from "../components/StorefrontOpenStatus";
import { StorefrontSortSelect } from "../components/StorefrontSortSelect";
import { facebookUrl, groupHours, hoursSummary, instagramUrl, tiktokUrl } from "../settings";
import type { PublicStorefront, PublicStorefrontProduct } from "../types";
import { storefrontWhatsappHref } from "../whatsapp";
import { CardBoletaButton } from "./BoletaControls";
import { BoletaAside } from "./BoletaDock";
import { CategoryMenu } from "./CategoryMenu";
import { boletaStoreOf, type CatalogPageData, catalogHref, catalogSections } from "./catalogData";
import { DottedRow, PriceSticker, ProductVisual, ReceiptEdge, StoreLogo, WhatsappIcon } from "./shared";

const container = "mx-auto max-w-[1240px] px-4 sm:px-6";

/** Plantilla "Vitrina": hero, pestanas, tarjetas con sticker de precio y boleta al costado. */
export function VitrinaCatalog(data: CatalogPageData) {
  const { store, slug } = data;
  const sections = catalogSections(store);

  return (
    <>
      <VitrinaHero store={store} slug={slug} featured={data.featured} showPayment={sections.payment} />
      {store.banner_url ? (
        <div className="h-40 overflow-hidden border-b-2 border-sf-ink sm:h-56">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen remota de la tienda, sin loader configurado */}
          <img src={store.banner_url} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <VitrinaTabs data={data} showPayment={sections.payment} showContact={sections.contact} />
      <VitrinaProducts data={data} />
      {sections.payment ? <PaySection store={store} /> : null}
      {sections.contact ? <ContactSection store={store} /> : null}
    </>
  );
}

function VitrinaHero({
  store,
  slug,
  featured,
  showPayment,
}: {
  store: PublicStorefront;
  slug: string;
  featured: CatalogPageData["featured"];
  showPayment: boolean;
}) {
  const { settings } = store;
  const hours = settings.hours ? hoursSummary(settings.hours) : null;

  return (
    <header className="border-b-2 border-sf-ink bg-sf-primary text-sf-onPrimary">
      <div className={`${container} flex flex-wrap items-center gap-10 py-8 sm:gap-12 sm:py-12 lg:pb-14`}>
        <div className="flex min-w-0 flex-[1_1_560px] flex-wrap items-center gap-5 sm:gap-7">
          <StoreLogo
            store={store}
            className="h-16 w-16 -rotate-6 border-2 shadow-[3px_3px_0_var(--sf-ink)] sm:h-32 sm:w-32 sm:border-[3px] sm:shadow-[6px_6px_0_var(--sf-ink)]"
            textClassName="text-[22px] sm:text-[44px]"
          />
          <div className="min-w-0 flex-[1_1_240px]">
            <h1 className="break-words font-display text-[clamp(26px,5.4vw,80px)] uppercase leading-[0.92] tracking-[-0.02em]">
              {store.name}
            </h1>
            {store.description ? (
              <p className="mt-2 text-[13px] leading-normal opacity-90 sm:mt-3.5 sm:text-[19px]">{store.description}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2 font-receipt text-[11px] text-[#111111] sm:mt-4 sm:text-[13px]">
              {settings.hours ? (
                <StorefrontOpenStatus
                  hours={settings.hours}
                  timezone={store.timezone}
                  className="border-[1.5px] border-sf-ink bg-white px-2 py-1 font-bold sm:border-2 sm:px-2.5 sm:py-1.5"
                />
              ) : null}
              {hours ? (
                <span className="hidden border-2 border-sf-ink bg-white px-2.5 py-1.5 uppercase sm:inline">{hours}</span>
              ) : null}
              {settings.show_contact && settings.address ? (
                <span className="hidden border-2 border-sf-ink bg-white px-2.5 py-1.5 uppercase sm:inline">{settings.address}</span>
              ) : null}
            </div>
            <div className="mt-6 hidden flex-wrap gap-2.5 sm:flex">
              {store.whatsapp ? (
                <a
                  href={storefrontWhatsappHref(store.whatsapp, `Hola, quiero consultar por sus productos en ${store.name}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-sf-ink bg-sf-sticker px-[22px] py-[13px] text-base font-bold text-sf-onSticker shadow-[4px_4px_0_var(--sf-ink)] hover:opacity-90"
                >
                  <WhatsappIcon />
                  Escribenos
                </a>
              ) : null}
              {showPayment ? (
                <a
                  href="#pagar"
                  className="rounded-full border-2 border-sf-onPrimary px-[22px] py-[13px] text-base font-bold text-sf-onPrimary hover:opacity-80"
                >
                  Como pagar
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {featured && featured.items.length > 0 ? (
          <div className="mx-auto hidden min-w-0 flex-[0_1_330px] rotate-2 sm:block">
            <div className="border-2 border-b-0 border-sf-ink bg-white px-5 pb-3.5 pt-[22px] font-receipt text-[13px] leading-[1.9] text-[#111111]">
              <div className="flex justify-between font-bold">
                <span>{featured.source === "manual" ? "DESTACADOS" : "EN OFERTA"}</span>
                <span aria-hidden="true">★</span>
              </div>
              <div className="my-2 border-t-2 border-dashed border-[#111111]" />
              <ul>
                {featured.items.slice(0, 6).map((product) => (
                  <li key={product.id}>
                    <Link href={`/t/${slug}/producto/${product.id}`} className="block hover:opacity-70">
                      <DottedRow left={<span className="line-clamp-1">{product.name}</span>} right={formatCurrency(product.effective_price)} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <ReceiptEdge />
          </div>
        ) : null}
      </div>
    </header>
  );
}

function VitrinaTabs({ data, showPayment, showContact }: { data: CatalogPageData; showPayment: boolean; showContact: boolean }) {
  const linkClass = "px-4 py-[18px] text-[15px] font-bold text-sf-ink hover:opacity-70";
  return (
    <nav aria-label="Secciones de la tienda" className="relative hidden border-b-2 border-sf-ink bg-white sm:block">
      <div className={`${container} flex flex-wrap gap-1`}>
        <a href="#productos" className={`${linkClass} -mb-0.5 border-b-4 border-sf-primary`}>
          Productos
        </a>
        {data.categories.length > 0 ? (
          <CategoryMenu
            summaryClassName={linkClass}
            items={data.categories.map((category) => ({
              id: category.id,
              name: category.name,
              count: category.product_count,
              href: `${catalogHref(data.slug, { category: category.id, sort: data.sort, defaultSort: data.defaultSort })}#productos`,
            }))}
          />
        ) : null}
        {showPayment ? (
          <a href="#pagar" className={linkClass}>
            Como pagar
          </a>
        ) : null}
        {showContact ? (
          <a href="#contacto" className={linkClass}>
            Contacto
          </a>
        ) : null}
      </div>
    </nav>
  );
}

function VitrinaProducts({ data }: { data: CatalogPageData }) {
  const { slug, store, categories, productList, q, category, sort, defaultSort, offset, pageSize } = data;
  const activeCategory = category ? categories.find((c) => c.id === category) : undefined;
  const chip = "inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-sf-ink px-3 py-[7px] text-[13px] font-bold sm:px-4 sm:py-2.5 sm:text-sm";

  return (
    <section id="productos" className={`${container} scroll-mt-4 pb-16 pt-4 sm:pb-24 sm:pt-10`}>
      <div className="flex flex-wrap items-center gap-3">
        <form action={`/t/${slug}`} className="flex min-w-0 flex-[1_1_360px] items-center gap-2.5 rounded-full border-2 border-sf-ink bg-white px-4 sm:px-[18px]">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {sort !== defaultSort ? <input type="hidden" name="sort" value={sort} /> : null}
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <label htmlFor="storefront-search" className="sr-only">
            Buscar producto
          </label>
          <input
            id="storefront-search"
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar producto…"
            className="min-w-0 flex-1 bg-transparent py-3 font-archivo text-base text-sf-ink outline-none sm:py-3.5"
          />
        </form>
        <StorefrontSortSelect
          slug={slug}
          q={q}
          categoryId={category}
          sort={sort}
          defaultSort={defaultSort}
          className="flex items-center gap-2.5 text-sm font-semibold text-sf-ink"
          selectClassName="rounded-full border-2 border-sf-ink bg-white px-3 py-2 font-archivo text-[13px] font-semibold text-sf-ink sm:px-3.5 sm:py-3 sm:text-[15px]"
        />
      </div>

      {categories.length > 0 ? (
        <nav aria-label="Categorias" className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:mt-4 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0">
          <Link
            href={catalogHref(slug, { q, sort, defaultSort })}
            aria-current={!category ? "page" : undefined}
            className={`${chip} ${!category ? "bg-sf-ink text-white" : "bg-white text-sf-ink"}`}
          >
            Todos
          </Link>
          {categories.map((item) => {
            const active = item.id === category;
            return (
              <Link
                key={item.id}
                href={catalogHref(slug, { q, category: item.id, sort, defaultSort })}
                aria-current={active ? "page" : undefined}
                className={`${chip} ${active ? "bg-sf-ink text-white" : "bg-white text-sf-ink"}`}
              >
                {item.name}
                <span className="font-receipt text-xs opacity-75">{item.product_count}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      <div className="mt-6 flex flex-wrap items-start gap-8 sm:mt-8">
        <div className="min-w-0 flex-[999_1_560px]">
          <p className="mb-4 font-receipt text-[13px] text-sf-ink">
            {productList.total} {productList.total === 1 ? "producto" : "productos"}
            {activeCategory ? ` en ${activeCategory.name}` : ""}
          </p>
          {productList.items.length === 0 ? (
            <div className="border-2 border-dashed border-sf-ink bg-white p-12 text-center text-[17px] text-sf-ink">
              {q ? `No encontramos productos para "${q}".` : "Todavia no hay productos en esta seccion."}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-[18px] sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-x-5 sm:gap-y-7">
              {productList.items.map((product) => (
                <li key={product.id}>
                  <VitrinaCard slug={slug} product={product} />
                </li>
              ))}
            </ul>
          )}
          {productList.total > pageSize ? (
            <div className="mt-8">
              <Pagination
                basePath={`/t/${slug}`}
                searchParams={new URLSearchParams(catalogHref(slug, { q, category, sort, defaultSort }).split("?")[1] ?? "")}
                total={productList.total}
                limit={pageSize}
                offset={offset}
              />
            </div>
          ) : null}
        </div>
        <BoletaAside store={boletaStoreOf(slug, store)} />
      </div>
    </section>
  );
}

export function VitrinaCard({ slug, product }: { slug: string; product: PublicStorefrontProduct }) {
  const href = `/t/${slug}/producto/${product.id}`;
  const onSale = product.effective_price !== product.price;
  return (
    <div className="flex h-full flex-col border-2 border-sf-ink bg-white text-sf-ink">
      <Link href={href} className="relative block h-[92px] border-b-2 border-sf-ink sm:h-40" tabIndex={-1} aria-hidden="true">
        <div className="h-full w-full overflow-hidden">
          <ProductVisual product={product} textClassName="text-[34px] sm:text-[54px]" />
        </div>
        {product.category ? (
          <span className="absolute left-2.5 top-2.5 hidden border-[1.5px] border-[#111111] bg-white px-1.5 py-0.5 font-receipt text-[11px] font-bold text-[#111111] sm:inline">
            {product.category}
          </span>
        ) : null}
        {product.available && product.low_stock ? (
          <span className="absolute right-2.5 top-2.5 bg-[#111111] px-1.5 py-0.5 font-receipt text-[10px] font-bold text-white sm:text-[11px]">
            ULTIMAS UNIDADES
          </span>
        ) : null}
        <PriceSticker
          price={product.effective_price}
          className="absolute -bottom-[18px] right-1.5 h-[52px] w-[52px] rotate-[8deg] text-[13px] sm:-bottom-[26px] sm:right-2.5 sm:h-[74px] sm:w-[74px] sm:text-[18px]"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-2 px-2.5 pb-2.5 pt-3 sm:gap-3 sm:px-3.5 sm:pb-3.5 sm:pt-4">
        <h3 className="min-h-[2.5em] pr-8 text-[13px] font-bold leading-tight sm:pr-16 sm:text-base">
          <Link href={href} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        {onSale ? (
          <p className="-mt-1 text-xs text-sf-muted">
            Antes <span className="line-through">{formatCurrency(product.price)}</span>
          </p>
        ) : null}
        <div className="mt-auto">
          <CardBoletaButton product={product} />
        </div>
      </div>
    </div>
  );
}

function PaySection({ store }: { store: PublicStorefront }) {
  const steps = [
    "Arma tu boleta con los productos que quieres.",
    "Enviala por WhatsApp; la tienda confirma tu pedido.",
    "Paga con el QR y manda tu comprobante.",
  ];
  return (
    <section id="pagar" className="scroll-mt-4 border-y-2 border-sf-ink bg-white text-sf-ink">
      <div className={`${container} flex flex-wrap items-center gap-14 py-16 sm:py-[88px]`}>
        <div className="min-w-0 flex-[1_1_520px]">
          <p className="font-receipt text-[13px] font-bold tracking-[0.1em]">COMO PAGAR</p>
          <h2 className="mt-3 font-display text-[clamp(32px,4vw,56px)] uppercase leading-none">Pide, paga con QR y listo.</h2>
          <ol className="mt-8 flex flex-col gap-[18px]">
            {steps.map((step, index) => (
              <li key={step} className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-sf-ink bg-sf-sticker font-display text-xl text-sf-onSticker">
                  {index + 1}
                </span>
                <span className="text-lg">{step}</span>
              </li>
            ))}
          </ol>
          {store.payment_instructions ? (
            <div className="mt-8 border-2 border-sf-ink bg-sf-paper px-5 py-[18px]">
              <p className="font-receipt text-xs font-bold">NOTA DE LA TIENDA</p>
              <p className="mt-1.5 text-[17px] leading-normal">{store.payment_instructions}</p>
            </div>
          ) : null}
        </div>
        {store.payment_qr_url ? (
          <div className="relative mx-auto min-w-0 flex-[0_1_340px]">
            <div className="border-2 border-sf-ink bg-white p-6 text-center shadow-[10px_10px_0_var(--sf-primary)]">
              <p className="font-receipt text-[13px] font-bold">QR DE PAGO</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen remota (Cloudinary), sin loader configurado */}
              <img src={store.payment_qr_url} alt="QR de pago de la tienda" className="mx-auto mt-4 h-[220px] w-[220px] object-contain" />
              <p className="mt-3.5 text-[13px] text-sf-muted">AloKe, ZAS o QR de tu banco</p>
            </div>
            <div className="absolute -right-3.5 -top-[26px] flex h-24 w-24 rotate-12 items-center justify-center rounded-full border-2 border-sf-ink bg-sf-sticker text-center font-display text-sm leading-[1.05] text-sf-onSticker">
              ESCANEA
              <br />Y PAGA
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ContactSection({ store }: { store: PublicStorefront }) {
  const { settings } = store;
  const groups = settings.hours ? groupHours(settings.hours) : [];
  const openGroups = groups.filter((g) => g.open);
  const closedGroups = groups.filter((g) => !g.open);
  const socials = [
    settings.facebook ? { label: "Facebook", href: facebookUrl(settings.facebook) } : null,
    settings.instagram ? { label: "Instagram", href: instagramUrl(settings.instagram) } : null,
    settings.tiktok ? { label: "TikTok", href: tiktokUrl(settings.tiktok) } : null,
  ].filter((social) => social !== null);
  const card = "flex flex-col gap-2 bg-white p-6 text-[#111111]";

  return (
    <section id="contacto" className="scroll-mt-4 bg-sf-ink text-white">
      <div className={`${container} py-16 sm:py-[88px]`}>
        <p className="font-receipt text-[13px] font-bold tracking-[0.1em] text-sf-stickerOnDark">CONTACTO</p>
        <h2 className="mt-3 font-display text-[clamp(32px,4vw,56px)] uppercase leading-none">Visitanos o escribenos.</h2>
        <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          {store.whatsapp ? (
            <a
              href={storefrontWhatsappHref(store.whatsapp, `Hola, quiero consultar por sus productos en ${store.name}`)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${card} hover:opacity-90`}
            >
              <span className="font-receipt text-xs font-bold">WHATSAPP</span>
              <span className="font-display text-[22px]">+{store.whatsapp}</span>
              <span className="text-sm text-sf-muted">Respuesta en horario de atencion</span>
            </a>
          ) : null}
          {settings.address || settings.maps_url ? (
            <div className={card}>
              <span className="font-receipt text-xs font-bold">DIRECCION</span>
              <span className="font-display text-[22px]">{settings.address ?? "Ver ubicacion"}</span>
              {settings.maps_url ? (
                <a href={settings.maps_url} target="_blank" rel="noopener noreferrer nofollow" className="text-sm font-bold text-[#111111] hover:underline">
                  Abrir en el mapa →
                </a>
              ) : null}
            </div>
          ) : null}
          {openGroups.length > 0 ? (
            <div className={card}>
              <span className="font-receipt text-xs font-bold">HORARIO</span>
              {openGroups.map((group) => (
                <span key={group.days} className="font-display text-[22px]">
                  {group.days} {group.label}
                </span>
              ))}
              {closedGroups.length > 0 ? (
                <span className="text-sm text-sf-muted">{closedGroups.map((g) => g.days).join(", ")} cerrado</span>
              ) : null}
            </div>
          ) : null}
        </div>
        {socials.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2.5">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="rounded-full border-2 border-white px-4 py-2 text-sm font-bold text-white hover:bg-white hover:text-[#111111]"
              >
                {social.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
