/** Ajustes del catalogo publico (columna `storefront_settings` del backend). */

/** "popular": lo mas vendido en los ultimos 90 dias (solo el orden, nunca las cantidades). */
export type StorefrontSort = "name" | "popular" | "price_asc" | "price_desc";
export type StorefrontStockDisplay = "all" | "out_of_stock";

export interface StorefrontDayHours {
  is_open: boolean;
  opens_at: string | null;
  closes_at: string | null;
}

export type StorefrontTemplate = "vitrina" | "lista";

export const STOREFRONT_TEMPLATES: Array<{ value: StorefrontTemplate; label: string; description: string }> = [
  {
    value: "vitrina",
    label: "Vitrina",
    description: "Tarjetas grandes con stickers de precio. Ideal para tiendas y minimarkets.",
  },
  {
    value: "lista",
    label: "Lista de precios",
    description: "Una lista larga y compacta. Ideal para ferreterías y catálogos grandes.",
  },
];

export interface StorefrontSettings {
  template: StorefrontTemplate;
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
  template: "vitrina",
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

/** Colores de una plantilla: los de la tienda, o los de la plantilla si no eligio. */
export interface StorefrontTheme {
  template: StorefrontTemplate;
  primary: string;
  onPrimary: string;
  sticker: string;
  onSticker: string;
  /** El sticker sobre fondo oscuro (barra de la boleta, contacto): si es oscuro, blanco. */
  stickerOnDark: string;
  ink: string;
}

const TEMPLATE_DEFAULTS: Record<StorefrontTemplate, { primary: string; ink: string }> = {
  vitrina: { primary: "#1F3BFF", ink: "#111111" },
  lista: { primary: "#0F766E", ink: "#1E293B" },
};
const DEFAULT_STICKER = "#FFE14D";

export function storefrontTheme(store: {
  color_primary: string | null;
  color_secondary: string | null;
  settings: { template?: StorefrontTemplate };
}): StorefrontTheme {
  const template = store.settings.template === "lista" ? "lista" : "vitrina";
  const defaults = TEMPLATE_DEFAULTS[template];
  const primary = store.color_primary ?? defaults.primary;
  const sticker = store.color_secondary ?? DEFAULT_STICKER;
  return {
    template,
    primary,
    onPrimary: readableTextColor(primary),
    sticker,
    onSticker: readableTextColor(sticker),
    stickerOnDark: readableTextColor(sticker) === "#111111" ? sticker : "#FFFFFF",
    ink: defaults.ink,
  };
}

/** Variables CSS que usan las clases `sf-*` de Tailwind. */
export function themeStyle(theme: StorefrontTheme): Record<string, string> {
  return {
    "--sf-primary": theme.primary,
    "--sf-on-primary": theme.onPrimary,
    "--sf-sticker": theme.sticker,
    "--sf-on-sticker": theme.onSticker,
    "--sf-sticker-on-dark": theme.stickerOnDark,
    "--sf-ink": theme.ink,
  };
}

const CATEGORY_TINTS = ["#FFE9A3", "#C4D7FF", "#F1EDE3", "#BDEFD9", "#FFC9B8", "#E2E6FF"];

/** Fondo pastel estable por categoria, para productos sin foto. */
export function categoryTint(category: string | null | undefined): string {
  if (!category) return CATEGORY_TINTS[2];
  let hash = 0;
  for (const char of category) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return CATEGORY_TINTS[hash % CATEGORY_TINTS.length];
}

/** "AF" para "Aceite Fino 1l": las iniciales de las dos primeras palabras. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/** "Lun – Sab 08:00 – 21:00" con los dias abiertos del horario, para el hero. */
export function hoursSummary(hours: StorefrontDayHours[]): string | null {
  const open = groupHours(hours).filter((group) => group.open);
  if (open.length === 0) return null;
  return open
    .map((group) => `${group.days.replace(/([A-Za-z]{3})[a-z]*/g, "$1")} ${group.label}`)
    .join(" · ");
}
