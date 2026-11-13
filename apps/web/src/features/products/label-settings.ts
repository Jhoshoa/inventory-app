export type LabelPageSize = "Letter" | "A4";
export type LabelSizePreset = "20x10" | "30x20" | "40x25" | "50x30" | "60x40" | "70x35";

export interface ProductLabelSettings {
  pageSize: LabelPageSize;
  labelSize: LabelSizePreset;
  marginMm: string;
  gapMm: string;
  showName: boolean;
  showCode: boolean;
  showSku: boolean;
  showCategory: boolean;
  showPrice: boolean;
}

export interface LabelDimensions {
  pageWidthMm: number;
  pageHeightMm: number;
  labelWidthMm: number;
  labelHeightMm: number;
  marginMm: number;
  gapMm: number;
  paddingMm: number;
  qrSizeMm: number;
  columns: number;
  rows: number;
  labelsPerPage: number;
}

export const DEFAULT_LABEL_SETTINGS: ProductLabelSettings = {
  pageSize: "Letter",
  labelSize: "20x10",
  marginMm: "8",
  gapMm: "3",
  showName: true,
  showCode: true,
  showSku: true,
  showCategory: false,
  showPrice: true,
};

export const PAGE_SIZE_OPTIONS: Record<LabelPageSize, { label: string; widthMm: number; heightMm: number }> = {
  Letter: { label: "Carta (21,59 × 27,94 cm)", widthMm: 215.9, heightMm: 279.4 },
  A4: { label: "A4 (21 × 29,7 cm)", widthMm: 210, heightMm: 297 },
};

export const LABEL_SIZE_OPTIONS: Record<LabelSizePreset, { label: string; widthMm: number; heightMm: number }> = {
  "20x10": { label: "20 × 10 mm", widthMm: 20, heightMm: 10 },
  "30x20": { label: "30 × 20 mm", widthMm: 30, heightMm: 20 },
  "40x25": { label: "40 × 25 mm", widthMm: 40, heightMm: 25 },
  "50x30": { label: "50 × 30 mm", widthMm: 50, heightMm: 30 },
  "60x40": { label: "60 × 40 mm", widthMm: 60, heightMm: 40 },
  "70x35": { label: "70 × 35 mm", widthMm: 70, heightMm: 35 },
};

export function calculateLabelDimensions(settings: ProductLabelSettings): LabelDimensions {
  const page = PAGE_SIZE_OPTIONS[settings.pageSize];
  const label = LABEL_SIZE_OPTIONS[settings.labelSize];
  const marginMm = parseMillimeterValue(settings.marginMm, DEFAULT_LABEL_SETTINGS.marginMm);
  const gapMm = parseMillimeterValue(settings.gapMm, DEFAULT_LABEL_SETTINGS.gapMm);
  const paddingMm = label.heightMm <= 10 ? 0.8 : 1;
  const printableWidth = Math.max(page.widthMm - marginMm * 2, 0);
  const printableHeight = Math.max(page.heightMm - marginMm * 2, 0);
  const columns = Math.max(Math.floor((printableWidth + gapMm) / (label.widthMm + gapMm)), 0);
  const rows = Math.max(Math.floor((printableHeight + gapMm) / (label.heightMm + gapMm)), 0);
  const qrSizeMm = roundMm(Math.max(8, Math.min(label.heightMm - paddingMm * 2, label.widthMm * 0.48)));

  return {
    pageWidthMm: page.widthMm,
    pageHeightMm: page.heightMm,
    labelWidthMm: label.widthMm,
    labelHeightMm: label.heightMm,
    marginMm,
    gapMm,
    paddingMm,
    qrSizeMm,
    columns,
    rows,
    labelsPerPage: columns * rows,
  };
}

/** Cantidad por producto (tablero P05) y tope total para que la hoja no se vuelva inmanejable. */
export const MAX_LABELS_PER_PRODUCT = 100;
export const MAX_LABELS_TOTAL = 500;
export const MAX_MARGIN_MM = 30;

/** Margen en mm: vacío = 8; número de 0 a 30 (coma o punto). */
export function validateMargin(value: string) {
  const text = value.trim();
  if (!text) return null;
  const parsed = Number(text.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_MARGIN_MM) return `Un número de 0 a ${MAX_MARGIN_MM} mm`;
  return null;
}

/** Hojas que ocupan `total` etiquetas (0 si no entra ninguna por hoja). */
export function sheetCount(total: number, perPage: number) {
  if (total <= 0 || perPage <= 0) return 0;
  return Math.ceil(total / perPage);
}

const SETTINGS_KEY = "inventory.label-settings.v1";

/** La configuración se recuerda en este equipo; si el navegador no deja guardar, se usa la de siempre. */
export function loadLabelSettings(): ProductLabelSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_LABEL_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ProductLabelSettings>;
    return {
      ...DEFAULT_LABEL_SETTINGS,
      ...parsed,
      pageSize: parsed.pageSize && parsed.pageSize in PAGE_SIZE_OPTIONS ? parsed.pageSize : DEFAULT_LABEL_SETTINGS.pageSize,
      labelSize: parsed.labelSize && parsed.labelSize in LABEL_SIZE_OPTIONS ? parsed.labelSize : DEFAULT_LABEL_SETTINGS.labelSize,
    };
  } catch {
    return DEFAULT_LABEL_SETTINGS;
  }
}

export function saveLabelSettings(settings: ProductLabelSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Modo privado o almacenamiento bloqueado: no se recuerda, pero se imprime igual.
  }
}

function parseMillimeterValue(value: string, fallback: string) {
  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) return Number(fallback);
  return roundMm(parsed);
}

function roundMm(value: number) {
  return Math.round(value * 100) / 100;
}
