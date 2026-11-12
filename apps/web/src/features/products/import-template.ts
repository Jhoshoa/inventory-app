/** Límites del archivo (tablero P05). Las filas las vuelve a revisar la API (MAX_ROWS = 5000). */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 5000;

/** Las columnas que lee la API (EXPECTED_HEADERS del importador), sin `category_id`. */
export const IMPORT_COLUMNS = [
  "name",
  "price",
  "stock",
  "category",
  "sku",
  "unit",
  "min_stock",
  "cost_price",
  "qr_code",
  "photo_url",
  "vence",
  "aviso_dias",
] as const;

/** Problema del archivo antes de subirlo, o null. */
export function checkImportFile(file: Pick<File, "name" | "size">) {
  if (!file.name.toLowerCase().endsWith(".csv")) return "Selecciona un archivo con extensión .csv";
  if (file.size > IMPORT_MAX_BYTES) return "El archivo pesa más de 5 MB. Divídelo en partes más chicas.";
  if (file.size === 0) return "El archivo está vacío.";
  return null;
}

/** Lee el archivo como texto (FileReader: también en navegadores sin File.text()). */
export function readFileText(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Filas con datos (sin el encabezado ni las líneas vacías). Solo para mostrar; la API cuenta igual. */
export function countCsvRows(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  return Math.max(lines.length - 1, 0);
}

/**
 * Plantilla con las columnas exactas del importador y una fila de ejemplo. No es la
 * exportación de productos: esa trae `id` e `is_active` y, subida de nuevo, chocaría con
 * los SKU y códigos que ya existen.
 */
export function importTemplateCsv(today = new Date()) {
  const expiry = new Date(today);
  expiry.setDate(expiry.getDate() + 60);
  const vence = `${String(expiry.getDate()).padStart(2, "0")}/${String(expiry.getMonth() + 1).padStart(2, "0")}/${expiry.getFullYear()}`;
  const example = ["Leche Pil 1l", "7.50", "24", "Lácteos", "", "unidad", "5", "5.20", "", "", vence, ""];
  return `\uFEFF${IMPORT_COLUMNS.join(",")}\n${example.map(csvCell).join(",")}\n`;
}

/**
 * Fila como se ve en Excel: la API cuenta desde el primer producto (1) y en la planilla
 * ese producto está en la fila 2 (la 1 son los títulos). 0 = problema del archivo entero.
 */
export function spreadsheetRow(apiRow: number) {
  return apiRow > 0 ? apiRow + 1 : null;
}

/** Errores por fila para descargar (abre bien en Excel). */
export function importErrorsCsv(errors: { row: number; field: string; message: string }[]) {
  const lines = errors.map((error) =>
    [String(spreadsheetRow(error.row) ?? "archivo"), error.field, error.message].map(csvCell).join(","),
  );
  return `\uFEFFfila,campo,motivo\n${lines.join("\n")}\n`;
}

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
