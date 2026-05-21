import type {
  ImportActionState,
  ImportItemFormValues,
  ImportSearchParams,
  InventoryImportItem,
  InventoryImportItemStatus,
  InventoryImportStatus,
} from "./types";

export const DEFAULT_IMPORT_LIMIT = 20;
export const MAX_IMPORT_UPLOAD_SIZE = 8 * 1024 * 1024;
export const ACCEPTED_IMPORT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const importStatuses = new Set<InventoryImportStatus>([
  "all",
  "pending",
  "processing",
  "needs_review",
  "confirmed",
  "failed",
  "cancelled",
]);

const itemStatuses = new Set<InventoryImportItemStatus>([
  "draft",
  "approved",
  "rejected",
  "imported",
  "failed",
]);

export function parseImportSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): ImportSearchParams {
  const statusValue = firstValue(searchParams.status);
  return {
    status: importStatuses.has(statusValue as InventoryImportStatus)
      ? (statusValue as InventoryImportStatus)
      : "all",
    limit: parseBoundedInteger(firstValue(searchParams.limit), DEFAULT_IMPORT_LIMIT, 1, 100),
    offset: parseBoundedInteger(firstValue(searchParams.offset), 0, 0, 100_000),
  };
}

export function buildImportQueryString(params: ImportSearchParams) {
  const query = new URLSearchParams();
  if (params.status !== "all") query.set("status", params.status);
  query.set("limit", params.limit.toString());
  query.set("offset", params.offset.toString());
  return query.toString();
}

export function validateImportUpload(file: File | null | undefined) {
  if (!file) return "Selecciona una imagen";
  if (!ACCEPTED_IMPORT_IMAGE_TYPES.has(file.type)) {
    return "Usa una imagen JPG, PNG o WebP";
  }
  if (file.size > MAX_IMPORT_UPLOAD_SIZE) {
    return "La imagen debe pesar 8 MB o menos";
  }
  return undefined;
}

export function validateImportItem(values: ImportItemFormValues) {
  const errors: ImportActionState["fieldErrors"] = {};
  const status = itemStatuses.has(values.status) ? values.status : "draft";

  if (status === "approved" && !values.name.trim()) {
    errors.name = "Nombre es requerido para aprobar";
  }
  if (!values.unit.trim()) errors.unit = "Unidad es requerida";
  if (values.name.trim().length > 100) errors.name = "Nombre debe tener maximo 100 caracteres";
  if (values.category.trim().length > 50) errors.category = "Categoria debe tener maximo 50 caracteres";
  if (values.sku.trim().length > 50) errors.sku = "SKU debe tener maximo 50 caracteres";
  if (values.unit.trim().length > 20) errors.unit = "Unidad debe tener maximo 20 caracteres";

  const price = Number(values.price);
  if (values.price === "") errors.price = "Precio es requerido";
  else if (!Number.isFinite(price) || price < 0) errors.price = "Precio debe ser mayor o igual a 0";

  const cost = Number(values.cost_price);
  if (values.cost_price !== "" && (!Number.isFinite(cost) || cost < 0)) {
    errors.cost_price = "Costo debe ser mayor o igual a 0";
  }

  const stock = Number(values.stock);
  if (values.stock === "") errors.stock = "Stock es requerido";
  else if (!Number.isInteger(stock) || stock < 0) errors.stock = "Stock debe ser entero mayor o igual a 0";

  const minStock = Number(values.min_stock);
  if (values.min_stock === "") errors.min_stock = "Stock minimo es requerido";
  else if (!Number.isInteger(minStock) || minStock < 0) {
    errors.min_stock = "Stock minimo debe ser entero mayor o igual a 0";
  }

  return errors;
}

export function formDataToImportItemValues(formData: FormData): ImportItemFormValues {
  return {
    import_id: stringValue(formData, "import_id"),
    item_id: stringValue(formData, "item_id"),
    status: normalizeItemStatus(stringValue(formData, "status")),
    name: stringValue(formData, "name"),
    category: stringValue(formData, "category"),
    sku: stringValue(formData, "sku"),
    unit: stringValue(formData, "unit") || "unidad",
    price: stringValue(formData, "price"),
    cost_price: stringValue(formData, "cost_price"),
    stock: stringValue(formData, "stock"),
    min_stock: stringValue(formData, "min_stock"),
  };
}

export function importItemToFormValues(item: InventoryImportItem): ImportItemFormValues {
  return {
    import_id: item.import_id,
    item_id: item.id,
    status: normalizeItemStatus(item.status),
    name: item.name,
    category: item.category ?? "",
    sku: item.sku ?? "",
    unit: item.unit,
    price: item.price,
    cost_price: item.cost_price ?? "",
    stock: item.stock.toString(),
    min_stock: item.min_stock.toString(),
  };
}

export function importStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    processing: "Procesando",
    needs_review: "En revision",
    confirmed: "Confirmada",
    failed: "Fallida",
    cancelled: "Cancelada",
  };
  return labels[status] ?? status;
}

export function itemStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Draft",
    approved: "Aprobado",
    rejected: "Rechazado",
    imported: "Importado",
    failed: "Fallido",
  };
  return labels[status] ?? status;
}

export function isImportEditable(status: string) {
  return status === "needs_review";
}

export function countImportItems(items: InventoryImportItem[]) {
  return items.reduce(
    (counts, item) => {
      if (item.status === "approved") counts.approved += 1;
      else if (item.status === "rejected") counts.rejected += 1;
      else if (item.status === "imported") counts.imported += 1;
      else if (item.status === "failed") counts.failed += 1;
      else counts.draft += 1;
      return counts;
    },
    { draft: 0, approved: 0, rejected: 0, imported: 0, failed: 0 },
  );
}

function normalizeItemStatus(value: string): InventoryImportItemStatus {
  return itemStatuses.has(value as InventoryImportItemStatus)
    ? (value as InventoryImportItemStatus)
    : "draft";
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
