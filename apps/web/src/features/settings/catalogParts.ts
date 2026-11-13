// Partes del catálogo público (tablero P11): lista con resumen en el celular, menú de
// partes con la vista previa al lado en escritorio.

export type CatalogPart = "estado" | "plantilla" | "identidad" | "secciones" | "productos" | "whatsapp" | "contacto";

export const CATALOG_PARTS: { key: CatalogPart; label: string }[] = [
  { key: "estado", label: "Estado y link" },
  { key: "plantilla", label: "Plantilla" },
  { key: "identidad", label: "Identidad" },
  { key: "secciones", label: "Secciones" },
  { key: "productos", label: "Productos" },
  { key: "whatsapp", label: "Pedidos por WhatsApp" },
  { key: "contacto", label: "Contacto y horario" },
];

const ERROR_PART: Record<string, CatalogPart> = {
  slug: "estado",
  colorPrimary: "identidad",
  colorSecondary: "identidad",
  description: "identidad",
  announcementText: "secciones",
  featured: "secciones",
  whatsapp: "whatsapp",
  paymentInstructions: "whatsapp",
  address: "contacto",
  mapsUrl: "contacto",
  facebook: "contacto",
  instagram: "contacto",
  tiktok: "contacto",
  settings: "contacto",
};

/** La parte del primer error (en el orden de las partes), para abrirla al guardar. */
export function partForError(keys: string[]): CatalogPart | null {
  const parts = new Set(keys.map((key) => (key.startsWith("hours") ? "contacto" : ERROR_PART[key])).filter(Boolean));
  return CATALOG_PARTS.find((item) => parts.has(item.key))?.key ?? null;
}
