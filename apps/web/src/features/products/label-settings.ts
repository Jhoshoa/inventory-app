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
  Letter: { label: "Letter / Carta (21.59 x 27.94 cm)", widthMm: 215.9, heightMm: 279.4 },
  A4: { label: "A4 (21.00 x 29.70 cm)", widthMm: 210, heightMm: 297 },
};

export const LABEL_SIZE_OPTIONS: Record<LabelSizePreset, { label: string; widthMm: number; heightMm: number }> = {
  "20x10": { label: "20 x 10 mm (2.0 x 1.0 cm)", widthMm: 20, heightMm: 10 },
  "30x20": { label: "30 x 20 mm (3.0 x 2.0 cm)", widthMm: 30, heightMm: 20 },
  "40x25": { label: "40 x 25 mm (4.0 x 2.5 cm)", widthMm: 40, heightMm: 25 },
  "50x30": { label: "50 x 30 mm (5.0 x 3.0 cm)", widthMm: 50, heightMm: 30 },
  "60x40": { label: "60 x 40 mm (6.0 x 4.0 cm)", widthMm: 60, heightMm: 40 },
  "70x35": { label: "70 x 35 mm (7.0 x 3.5 cm)", widthMm: 70, heightMm: 35 },
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

function parseMillimeterValue(value: string, fallback: string) {
  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) return Number(fallback);
  return roundMm(parsed);
}

function roundMm(value: number) {
  return Math.round(value * 100) / 100;
}
