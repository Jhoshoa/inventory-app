import type { StorefrontSort } from "../settings";
import type {
  PublicStorefront,
  PublicStorefrontCategory,
  PublicStorefrontFeatured,
  PublicStorefrontProductList,
} from "../types";
import type { BoletaStore } from "./BoletaPanel";

/** Todo lo que una plantilla necesita para pintar la pagina del catalogo. */
export interface CatalogPageData {
  slug: string;
  store: PublicStorefront;
  categories: PublicStorefrontCategory[];
  productList: PublicStorefrontProductList;
  featured: PublicStorefrontFeatured | null;
  q?: string;
  category?: string;
  sort: StorefrontSort;
  defaultSort: StorefrontSort;
  offset: number;
  pageSize: number;
}

export function boletaStoreOf(slug: string, store: PublicStorefront): BoletaStore {
  return {
    slug,
    name: store.name,
    whatsapp: store.whatsapp,
    paymentQrUrl: store.payment_qr_url,
    paymentInstructions: store.payment_instructions,
    pickupEnabled: store.settings.pickup_enabled,
    deliveryEnabled: store.settings.delivery_enabled,
  };
}

/** Que secciones informativas tienen algo para mostrar. */
export function catalogSections(store: PublicStorefront) {
  const { settings } = store;
  return {
    payment: settings.show_payment && Boolean(store.payment_qr_url || store.payment_instructions),
    contact:
      settings.show_contact &&
      Boolean(store.whatsapp || settings.address || settings.maps_url || settings.hours || settings.instagram || settings.facebook || settings.tiktok),
  };
}

export function catalogHref(
  slug: string,
  values: { q?: string; category?: string; sort?: StorefrontSort; defaultSort?: StorefrontSort },
) {
  const params = new URLSearchParams();
  if (values.q) params.set("q", values.q);
  if (values.category) params.set("category", values.category);
  if (values.sort && values.sort !== values.defaultSort) params.set("sort", values.sort);
  const qs = params.toString();
  return `/t/${slug}${qs ? `?${qs}` : ""}`;
}
