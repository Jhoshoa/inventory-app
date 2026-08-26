import type {
  ProductDiscountType,
  ProductFormValues,
  ProductSearchParams,
  ProductSortField,
  ProductStockFilter,
  SortDirection,
} from "./types";

const stockFilters = new Set<ProductStockFilter>(["all", "available", "low", "out"]);
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

export function validateProductForm(values: ProductFormValues, mode: "create" | "edit") {
  const errors: Partial<Record<keyof ProductFormValues, string>> = {};

  if (!values.name.trim()) errors.name = "Nombre es requerido";
  if (values.name.trim().length > 100) errors.name = "Nombre debe tener maximo 100 caracteres";

  const price = Number(values.price);
  if (!values.price) errors.price = "Precio es requerido";
  else if (!Number.isFinite(price) || price <= 0) errors.price = "Precio debe ser mayor a 0";

  const stock = Number(values.stock);
  if (mode === "create" && values.stock === "") errors.stock = "Stock inicial es requerido";
  else if (values.stock !== "" && (!Number.isInteger(stock) || stock < 0)) {
    errors.stock = "Stock debe ser un entero mayor o igual a 0";
  }

  const minStock = Number(values.min_stock);
  if (values.min_stock !== "" && (!Number.isInteger(minStock) || minStock < 0)) {
    errors.min_stock = "Stock minimo debe ser un entero mayor o igual a 0";
  }

  const costPrice = Number(values.cost_price);
  if (values.cost_price !== "" && (!Number.isFinite(costPrice) || costPrice < 0)) {
    errors.cost_price = "Costo debe ser mayor o igual a 0";
  }

  if (values.sku && values.sku.length > 50) errors.sku = "SKU debe tener maximo 50 caracteres";

  if (values.discount_type) {
    const discountValue = Number(values.discount_value);
    if (values.discount_value === "" || !Number.isFinite(discountValue) || discountValue < 0) {
      errors.discount_value = "Ingresa un valor de descuento valido";
    } else if (values.discount_type === "percentage" && discountValue > 100) {
      errors.discount_value = "El porcentaje no puede superar 100";
    } else if (values.discount_type === "fixed" && price > 0 && discountValue > price) {
      errors.discount_value = "La rebaja no puede ser mayor al precio de venta";
    }
  }

  return errors;
}

export const STOCK_ADJUSTMENT_MAX = 1_000_000;

export function validateStockAdjustment(quantity: string, reason: string, currentStock?: number) {
  const errors: { quantity?: string; reason?: string } = {};
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
}): ProductFormValues {
  return {
    name: product?.name ?? "",
    price: product?.price ?? "",
    stock: product ? product.stock.toString() : "0",
    category_id: product?.category_id ?? "",
    category: product?.category ?? "",
    min_stock: product ? product.min_stock.toString() : "1",
    unit: product?.unit ?? "unidad",
    sku: product?.sku ?? "",
    cost_price: product?.cost_price ?? "",
    qr_code: product?.qr_code ?? "",
    photo_url: product?.photo_url ?? "",
    discount_type: product?.discount_type ?? "",
    discount_value: product?.discount_value ?? "",
  };
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
