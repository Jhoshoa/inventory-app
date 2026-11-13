// Secciones de Configuración (tableros A · Configuración y P10): tres grupos, el
// buscador del índice y el menú de la izquierda en escritorio.

export type SettingsSectionKey = "tienda" | "precios" | "catalogo" | "usuarios" | "plan" | "perfil";

export interface SettingsSection {
  key: SettingsSectionKey;
  label: string;
  href: string;
  /** Las dos letras del índice (tablero P10). */
  badge: string;
  /** Lo que dice debajo si no hay un resumen con datos. */
  hint: string;
  /** Palabras para el buscador ("WhatsApp" → Catálogo público). */
  keywords: string[];
}

export const SETTINGS_GROUPS: { title: string; sections: SettingsSection[] }[] = [
  {
    title: "Tu negocio",
    sections: [
      {
        key: "tienda",
        label: "Datos de la tienda",
        href: "/dashboard/settings/tienda",
        badge: "Ti",
        hint: "Nombre, dirección, teléfono, zona horaria",
        keywords: ["logo", "nombre", "dirección", "teléfono", "recibo", "zona horaria"],
      },
      {
        key: "precios",
        label: "Precios y descuentos",
        href: "/dashboard/settings/precios",
        badge: "%",
        hint: "Descuentos al cobrar",
        keywords: ["descuento", "porcentaje", "rebaja", "cajero"],
      },
    ],
  },
  {
    title: "Ventas en línea",
    sections: [
      {
        key: "catalogo",
        label: "Catálogo público",
        href: "/dashboard/settings/catalogo",
        badge: "Wa",
        hint: "Plantilla, destacados, WhatsApp, horario",
        keywords: ["catálogo", "whatsapp", "link", "plantilla", "horario", "colores", "pedidos", "qr de pago"],
      },
    ],
  },
  {
    title: "Equipo y cuenta",
    sections: [
      {
        key: "usuarios",
        label: "Usuarios y permisos",
        href: "/dashboard/settings/usuarios",
        badge: "Eq",
        hint: "Quién entra y qué puede hacer",
        keywords: ["usuarios", "personas", "cajero", "dueño", "invitar", "permisos", "roles"],
      },
      {
        key: "plan",
        label: "Plan y pagos",
        href: "/dashboard/settings/billing",
        badge: "Pl",
        hint: "Historial de pagos y renovación",
        keywords: ["plan", "pago", "suscripción", "prueba", "factura"],
      },
      {
        key: "perfil",
        label: "Mi perfil",
        href: "/dashboard/settings/perfil",
        badge: "Yo",
        hint: "Correo, contraseña, cerrar sesión",
        keywords: ["perfil", "correo", "contraseña", "cerrar sesión", "cuenta"],
      },
    ],
  },
];

export const SETTINGS_SECTIONS = SETTINGS_GROUPS.flatMap((group) => group.sections);

export function settingsSection(key: SettingsSectionKey) {
  return SETTINGS_SECTIONS.find((section) => section.key === key)!;
}

function fold(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** El buscador del índice: nombre, resumen y palabras de cada sección, sin acentos. */
export function filterSettingsGroups(query: string) {
  const needle = fold(query.trim());
  if (!needle) return SETTINGS_GROUPS;
  return SETTINGS_GROUPS.map((group) => ({
    ...group,
    sections: group.sections.filter((section) =>
      [section.label, section.hint, ...section.keywords].some((text) => fold(text).includes(needle)),
    ),
  })).filter((group) => group.sections.length > 0);
}

/** "Hasta 15% · cajeros con permiso" para Precios y descuentos. */
export function discountSummary(store: {
  allow_percentage_discount: boolean;
  max_percentage_discount: string;
  allow_manual_discount: boolean;
  max_manual_discount_amount: string;
  allow_cashier_discount_override: boolean;
}) {
  const parts: string[] = [];
  if (store.allow_percentage_discount) parts.push(`Hasta ${Number(store.max_percentage_discount)}%`);
  if (store.allow_manual_discount) {
    parts.push(`hasta Bs ${Number(store.max_manual_discount_amount).toLocaleString("es-BO", { maximumFractionDigits: 2 })}`);
  }
  if (parts.length === 0) return "Sin descuentos al cobrar";
  if (store.allow_cashier_discount_override) parts.push("cajeros con permiso");
  const text = parts.join(" · ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "2 personas · 1 invitación pendiente". */
export function teamSummary(people: number, pendingInvitations: number) {
  const parts = [people === 1 ? "1 persona" : `${people} personas`];
  if (pendingInvitations > 0) {
    parts.push(pendingInvitations === 1 ? "1 invitación pendiente" : `${pendingInvitations} invitaciones pendientes`);
  }
  return parts.join(" · ");
}

const TIMEZONES: Record<string, string> = {
  "America/La_Paz": "Bolivia (La Paz) · GMT−4",
};

export function timezoneText(timezone: string | null | undefined) {
  if (!timezone) return TIMEZONES["America/La_Paz"];
  return TIMEZONES[timezone] ?? timezone.replace(/_/g, " ");
}
