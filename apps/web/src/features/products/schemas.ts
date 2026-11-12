import { formatCurrency, parseMoney } from "@/lib/format/currency";
import type {
  ProductDiscountType,
  ProductFormValues,
  ProductSearchParams,
  ProductSortField,
  ProductStockFilter,
  SortDirection,
} from "./types";

const stockFilters = new Set<ProductStockFilter>(["all", "available", "low", "out", "expiring"]);
const sortFields = new Set<ProductSortField>(["name", "stock", "updated_at", "price"]);
const sortDirections = new Set<SortDirection>(["asc", "desc"]);

export const DEFAULT_PRODUCT_LIMIT = 50;
export const MIN_PRODUCT_SEARCH_LENGTH = 3;

export function parseProductSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): ProductSearchParams {
  const stock = firstValue(searchParams.stock);
  const sort = firstValue(searchParams.sort);
  const direction = firstValue(searchParams.direction);
  const limit = parseBoundedInteger(firstValue(searchParams.limit), DEFAULT_PRODUCT_LIMIT, 1, 100);

  return {
    q: optionalSearchString(firstValue(searchParams.q)),
    category: optionalString(firstValue(searchParams.category)),
    category_id: optionalString(firstValue(searchParams.category_id)),
    stock: stockFilters.has(stock as ProductStockFilter)
      ? (stock as ProductStockFilter)
      : "all",
    limit,
    offset: parseBoundedInteger(firstValue(searchParams.offset), 0, 0, 100_000),
    sort: sortFields.has(sort as ProductSortField) ? (sort as ProductSortField) : "name",
    direction: sortDirections.has(direction as SortDirection)
      ? (direction as SortDirection)
      : "asc",
  };
}

export function buildProductQueryString(params: ProductSearchParams) {
  const query = new URLSearchParams();
  if (params.q && params.q.length >= MIN_PRODUCT_SEARCH_LENGTH) query.set("q", params.q);
  if (params.category) query.set("category", params.category);
  if (params.category_id) query.set("category_id", params.category_id);
  query.set("stock", params.stock);
  query.set("limit", params.limit.toString());
  query.set("offset", params.offset.toString());
  query.set("sort", params.sort);
  query.set("direction", params.direction);
  return query.toString();
}

/** Límites de descuento de la tienda (Configuración › Precios y descuentos). La API los vuelve a revisar. */
export interface DiscountPolicy {
  percentage: { allowed: boolean; max: number };
  fixed: { allowed: boolean; max: number };
}

export const PRODUCT_LIMITS = { name: 100, unit: 20, sku: 50, qr_code: 100 } as const;

/** Número de un monto escrito con coma o punto ("18,50"); null si no es un monto válido. */
export function moneyNumber(text: string) {
  const parsed = parseMoney(text);
  return parsed.ok ? Number(parsed.value) : null;
}

export function validateProductForm(
  values: ProductFormValues,
  mode: "create" | "edit",
  policy?: DiscountPolicy | null,
) {
  const errors: Partial<Record<keyof ProductFormValues, string>> = {};

  if (!values.name.trim()) errors.name = "Escribe el nombre del producto";
  else if (values.name.trim().length > PRODUCT_LIMITS.name) errors.name = `Máximo ${PRODUCT_LIMITS.name} caracteres`;

  const price = moneyNumber(values.price);
  if (!values.price.trim()) errors.price = "Escribe el precio de venta";
  else if (price === null) errors.price = "Escribe el precio como 18,50";
  else if (price <= 0) errors.price = "El precio tiene que ser mayor a 0";

  if (values.cost_price.trim() && moneyNumber(values.cost_price) === null) {
    errors.cost_price = "Escribe el costo como 12,00";
  }

  if (mode === "create") {
    if (values.stock.trim() === "") errors.stock = "Escribe cuántas unidades tienes (puede ser 0)";
    else if (!isWholeNumber(values.stock)) errors.stock = "Un número entero, 0 o más";
  }

  if (values.min_stock.trim() !== "" && !isWholeNumber(values.min_stock)) {
    errors.min_stock = "Un número entero, 0 o más";
  }

  if (values.unit.trim().length > PRODUCT_LIMITS.unit) errors.unit = `Máximo ${PRODUCT_LIMITS.unit} caracteres`;
  if (values.sku.length > PRODUCT_LIMITS.sku) errors.sku = `Máximo ${PRODUCT_LIMITS.sku} caracteres`;
  if (values.qr_code.length > PRODUCT_LIMITS.qr_code) errors.qr_code = `Máximo ${PRODUCT_LIMITS.qr_code} caracteres`;

  if (values.discount_type) {
    const discount = moneyNumber(values.discount_value);
    const rule = policy?.[values.discount_type];
    if (discount === null) {
      errors.discount_value =
        values.discount_type === "percentage" ? "Escribe el porcentaje, por ejemplo 10" : "Escribe la rebaja como 2,50";
    } else if (discount <= 0) {
      errors.discount_value = "Tiene que ser mayor a 0";
    } else if (rule && !rule.allowed) {
      errors.discount_value =
        values.discount_type === "percentage"
          ? "La tienda no permite descuentos por porcentaje"
          : "La tienda no permite rebajas en Bs";
    } else if (values.discount_type === "percentage" && discount > 100) {
      errors.discount_value = "El porcentaje no puede superar 100";
    } else if (values.discount_type === "percentage" && rule && discount > rule.max) {
      errors.discount_value = `El máximo de la tienda es ${formatPercent(rule.max)}%`;
    } else if (values.discount_type === "fixed" && price !== null && price > 0 && discount >= price) {
      errors.discount_value = "La rebaja tiene que ser menor al precio de venta";
    } else if (values.discount_type === "fixed" && rule && discount > rule.max) {
      errors.discount_value = `El máximo de la tienda es ${formatCurrency(rule.max)}`;
    }

    if (values.discount_ends_at) {
      const endsAt = new Date(`${values.discount_ends_at}T23:59:59`);
      if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= Date.now()) {
        errors.discount_ends_at = "Elige una fecha desde hoy en adelante";
      }
    }
  } else if (values.discount_ends_at) {
    errors.discount_ends_at = "La fecha solo va con un descuento";
  }

  if (mode === "create" && values.expires_on) {
    Object.assign(errors, validateBatchFields(values.expires_on, values.alert_days));
    if (!errors.stock && !(Number(values.stock) > 0)) {
      errors.expires_on = "Para poner vencimiento, el stock inicial tiene que ser mayor a 0";
    }
  }

  return errors;
}

function isWholeNumber(text: string) {
  return /^\d+$/.test(text.trim()) && Number.isSafeInteger(Number(text.trim()));
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

/** Igual que el backend: aviso entre 0 y 365 días. Vacío usa el aviso de la tienda (5 si nunca se cambió). */
export const DEFAULT_ALERT_DAYS = 5;
export const MAX_ALERT_DAYS = 365;

export function validateBatchFields(expiresOn: string, alertDays: string) {
  const errors: { expires_on?: string; alert_days?: string } = {};
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(expiresOn);
  const parsed = match ? new Date(`${expiresOn}T12:00:00`) : null;
  if (!match || !parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== expiresOn) {
    errors.expires_on = "Elige una fecha válida";
  } else if (Number(match[1]) < 2000 || Number(match[1]) > 2100) {
    errors.expires_on = "Revisa el año de la fecha de vencimiento";
  }
  if (alertDays !== "") {
    const days = Number(alertDays);
    if (!Number.isInteger(days) || days < 0 || days > MAX_ALERT_DAYS) {
      errors.alert_days = `Un número entero de 0 a ${MAX_ALERT_DAYS}`;
    }
  }
  return errors;
}

/** Vacío va como null: la API usa el "Aviso de vencimiento" de la tienda (E11). */
export function alertDaysOrStoreDefault(alertDays: string) {
  return alertDays === "" ? null : Number(alertDays);
}

/** Aviso de vencimiento de la tienda: entero de 0 a 365, obligatorio. */
export function validateDefaultAlertDays(value: string) {
  const text = value.trim();
  if (!text) return "Escribe cuántos días antes avisar";
  const days = Number(text);
  if (!/^\d+$/.test(text) || !Number.isInteger(days) || days > MAX_ALERT_DAYS) {
    return `Un número entero de 0 a ${MAX_ALERT_DAYS}`;
  }
  return null;
}

export const STOCK_ADJUSTMENT_MAX = 1_000_000;

export function validateStockAdjustment(
  quantity: string,
  reason: string,
  currentStock?: number,
  batch: { expiresOn?: string; alertDays?: string; batchId?: string; batchAvailable?: number } = {},
) {
  const errors: { quantity?: string; reason?: string; expires_on?: string; alert_days?: string; batch_id?: string } = {};
  const parsed = Number(quantity);

  if (!quantity) {
    errors.quantity = "Cantidad es requerida";
  } else if (!Number.isInteger(parsed) || parsed === 0) {
    errors.quantity = "Cantidad debe ser un entero distinto de 0";
  } else if (Math.abs(parsed) > STOCK_ADJUSTMENT_MAX) {
    errors.quantity = `La cantidad no puede superar ${STOCK_ADJUSTMENT_MAX.toLocaleString("es-BO")} unidades`;
  } else if (parsed < 0 && typeof currentStock === "number" && Math.abs(parsed) > currentStock) {
    errors.quantity = `Stock insuficiente: disponible ${currentStock}`;
  }

  if (parsed < 0 && !reason.trim()) {
    errors.reason = "La razon es requerida para descontar stock";
  }

  if (reason.length > 120) errors.reason = "La razon debe tener maximo 120 caracteres";

  if (batch.expiresOn) {
    if (parsed < 0) errors.expires_on = "La fecha de vencimiento solo se indica al agregar stock";
    else Object.assign(errors, validateBatchFields(batch.expiresOn, batch.alertDays ?? ""));
  }
  if (batch.batchId) {
    if (parsed > 0) errors.batch_id = "El lote solo se elige al descontar stock";
    else if (
      !errors.quantity &&
      typeof batch.batchAvailable === "number" &&
      Math.abs(parsed) > batch.batchAvailable
    ) {
      errors.quantity = `Ese lote solo tiene ${batch.batchAvailable} unidades`;
    }
  }

  return errors;
}

export function formDataToProductValues(formData: FormData): ProductFormValues {
  const discountType = stringValue(formData, "discount_type");
  return {
    name: stringValue(formData, "name"),
    price: stringValue(formData, "price"),
    stock: stringValue(formData, "stock"),
    category_id: stringValue(formData, "category_id"),
    category: stringValue(formData, "category"),
    min_stock: stringValue(formData, "min_stock"),
    unit: stringValue(formData, "unit") || "unidad",
    sku: stringValue(formData, "sku"),
    cost_price: stringValue(formData, "cost_price"),
    qr_code: stringValue(formData, "qr_code"),
    photo_url: stringValue(formData, "photo_url"),
    discount_type: discountType === "percentage" || discountType === "fixed" ? discountType : "",
    discount_value: stringValue(formData, "discount_value"),
    discount_ends_at: stringValue(formData, "discount_ends_at"),
    expires_on: stringValue(formData, "expires_on"),
    alert_days: stringValue(formData, "alert_days"),
  };
}

export function productToFormValues(product?: {
  name: string;
  price: string;
  stock: number;
  category_id?: string | null;
  category: string | null;
  min_stock: number;
  unit: string;
  sku: string | null;
  cost_price: string | null;
  qr_code: string | null;
  photo_url: string | null;
  discount_type?: ProductDiscountType | null;
  discount_value?: string;
  discount_ends_at?: string | null;
}): ProductFormValues {
  return {
    name: product?.name ?? "",
    price: moneyText(product?.price),
    stock: product ? product.stock.toString() : "0",
    category_id: product?.category_id ?? "",
    category: product?.category ?? "",
    min_stock: product ? product.min_stock.toString() : "1",
    unit: product?.unit ?? "unidad",
    sku: product?.sku ?? "",
    cost_price: moneyText(product?.cost_price),
    qr_code: product?.qr_code ?? "",
    photo_url: product?.photo_url ?? "",
    discount_type: product?.discount_type ?? "",
    discount_value: product?.discount_type ? moneyText(product.discount_value) : "",
    discount_ends_at: product?.discount_ends_at ? product.discount_ends_at.slice(0, 10) : "",
    expires_on: "",
    alert_days: "",
  };
}

/** "7.50" de la API como se escribe en Bolivia: "7,50" (y "10.00" → "10"). */
function moneyText(value: string | null | undefined) {
  if (!value) return "";
  const [integer, decimals = ""] = value.split(".");
  const cents = decimals.replace(/0+$/, "");
  return cents ? `${integer},${decimals.padEnd(2, "0").slice(0, 2)}` : integer;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function optionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalSearchString(value: string | undefined) {
  const trimmed = optionalString(value);
  return trimmed && trimmed.length >= MIN_PRODUCT_SEARCH_LENGTH ? trimmed : undefined;
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
