/** Ajustes del catalogo publico (columna `storefront_settings` del backend). */

/** "popular": lo mas vendido en los ultimos 90 dias (solo el orden, nunca las cantidades). */
export type StorefrontSort = "name" | "popular" | "price_asc" | "price_desc";
export type StorefrontStockDisplay = "all" | "out_of_stock";

export interface StorefrontDayHours {
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
}

export interface StorefrontSettings {
  announcement_enabled: boolean;
  announcement_text: string | null;
  show_featured: boolean;
  show_payment: boolean;
  show_contact: boolean;
  stock_display: StorefrontStockDisplay;
  hide_out_of_stock: boolean;
  default_sort: StorefrontSort;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  address: string | null;
  maps_url: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  /** Lunes primero, 7 dias. null = la tienda no cargo horario. */
  hours: StorefrontDayHours[] | null;
  /** Productos del carrusel, en orden. Vacio = los productos en oferta. */
  featured_product_ids: string[];
}

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontSettings = {
  announcement_enabled: false,
  announcement_text: null,
  show_featured: true,
  show_payment: true,
  show_contact: true,
  stock_display: "all",
  hide_out_of_stock: false,
  default_sort: "name",
  pickup_enabled: true,
  delivery_enabled: false,
  address: null,
  maps_url: null,
  facebook: null,
  instagram: null,
  tiktok: null,
  hours: null,
  featured_product_ids: [],
};

export const STOREFRONT_SORTS: StorefrontSort[] = ["name", "popular", "price_asc", "price_desc"];

export const STOREFRONT_SORT_LABELS: Record<StorefrontSort, string> = {
  name: "Nombre (A-Z)",
  price_asc: "Precio: menor a mayor",
  price_desc: "Precio: mayor a menor",
  popular: "Mas pedidos",
};

export const WEEKDAYS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"] as const;

/** Ajustes con valores por defecto para lo que falte (tiendas que nunca guardaron). */
export function withStorefrontDefaults(settings: Partial<StorefrontSettings> | null | undefined): StorefrontSettings {
  return { ...DEFAULT_STOREFRONT_SETTINGS, ...(settings ?? {}) };
}

export function facebookUrl(handle: string) {
  return `https://www.facebook.com/${handle}`;
}

export function instagramUrl(handle: string) {
  return `https://www.instagram.com/${handle}`;
}

export function tiktokUrl(handle: string) {
  return `https://www.tiktok.com/@${handle}`;
}

/** Texto blanco o negro, el que se lea mejor sobre `hex` (luminancia WCAG). */
export function readableTextColor(hex: string): "#FFFFFF" | "#111111" {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return "#FFFFFF";
  const value = parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  // Contraste contra blanco vs. contra negro: gana el mayor.
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? "#FFFFFF" : "#111111";
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Dia (0 = lunes) y minuto del dia de `now` en la zona horaria de la tienda. */
export function storeLocalTime(now: Date, timeZone: string): { day: number; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    return storeLocalTime(now, "America/La_Paz");
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  return { day: Math.max(day, 0), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** Abierto ahora segun el horario. Un cierre antes de la apertura cruza la medianoche. */
export function isOpenNow(hours: StorefrontDayHours[], timeZone: string, now: Date = new Date()): boolean {
  const { day, minutes } = storeLocalTime(now, timeZone);
  const today = hours[day];
  const yesterday = hours[(day + 6) % 7];

  if (today?.is_open && today.opens_at && today.closes_at) {
    const opens = toMinutes(today.opens_at);
    const closes = toMinutes(today.closes_at);
    if (closes > opens ? minutes >= opens && minutes < closes : minutes >= opens) return true;
  }
  if (yesterday?.is_open && yesterday.opens_at && yesterday.closes_at) {
    const opens = toMinutes(yesterday.opens_at);
    const closes = toMinutes(yesterday.closes_at);
    if (closes < opens && minutes < closes) return true;
  }
  return false;
}

/** Une los dias seguidos con el mismo horario: "Lunes – Viernes 08:00 – 21:00". */
export function groupHours(hours: StorefrontDayHours[]): Array<{ days: string; label: string; open: boolean }> {
  const label = (d: StorefrontDayHours) =>
    d.is_open && d.opens_at && d.closes_at ? `${d.opens_at} – ${d.closes_at}` : "Cerrado";
  const groups: Array<{ start: number; end: number; label: string; open: boolean }> = [];
  hours.forEach((day, index) => {
    const current = label(day);
    const last = groups[groups.length - 1];
    if (last && last.label === current) {
      last.end = index;
    } else {
      groups.push({ start: index, end: index, label: current, open: day.is_open });
    }
  });
  return groups.map((g) => ({
    days: g.start === g.end ? WEEKDAYS[g.start] : `${WEEKDAYS[g.start]} – ${WEEKDAYS[g.end]}`,
    label: g.label,
    open: g.open,
  }));
}
