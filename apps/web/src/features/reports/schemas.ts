import type {
  ReportRangePreset,
  ReportSearchParams,
  StockMovementSearchParams,
  StockMovementType,
} from "./types";

export const DEFAULT_REPORT_LIMIT = 50;

const rangePresets = new Set<ReportRangePreset>(["today", "7d", "30d", "month", "custom"]);
const stockMovementTypes = new Set<StockMovementType>([
  "all",
  "sale",
  "sale_void",
  "manual_adjustment",
  "import",
  "stock_movement",
]);

export function parseReportSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  now = new Date(),
): ReportSearchParams {
  const rangeValue = firstValue(searchParams.range);
  const range = rangePresets.has(rangeValue as ReportRangePreset)
    ? (rangeValue as ReportRangePreset)
    : "month";
  const from = normalizeDateInput(firstValue(searchParams.from));
  const to = normalizeDateInput(firstValue(searchParams.to));

  if (from && to) {
    return { range, from, to };
  }

  if (range === "custom") {
    const fallback = rangeToDates("month", now);
    return {
      range,
      from: from ?? fallback.from,
      to: to ?? fallback.to,
    };
  }

  return { range, ...rangeToDates(range, now) };
}

export function parseStockMovementSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  now = new Date(),
): StockMovementSearchParams {
  const reportParams = parseReportSearchParams(searchParams, now);
  const typeValue = firstValue(searchParams.type);

  return {
    ...reportParams,
    product_id: optionalString(firstValue(searchParams.product_id)),
    type: stockMovementTypes.has(typeValue as StockMovementType)
      ? (typeValue as StockMovementType)
      : "all",
    limit: parseBoundedInteger(firstValue(searchParams.limit), DEFAULT_REPORT_LIMIT, 1, 100),
    offset: parseBoundedInteger(firstValue(searchParams.offset), 0, 0, 100_000),
  };
}

export function datesForReportRange(range: ReportRangePreset, now = new Date()) {
  return rangeToDates(range === "custom" ? "month" : range, now);
}

export function buildReportQueryString(params: ReportSearchParams) {
  const query = new URLSearchParams();
  query.set("range", params.range);
  query.set("from", params.from);
  query.set("to", params.to);
  return query.toString();
}

export function buildStockMovementQueryString(params: StockMovementSearchParams) {
  const query = new URLSearchParams(buildReportQueryString(params));
  if (params.product_id) query.set("product_id", params.product_id);
  query.set("type", params.type);
  query.set("limit", params.limit.toString());
  query.set("offset", params.offset.toString());
  return query.toString();
}

export function buildSalesReportApiQuery(params: ReportSearchParams) {
  const query = new URLSearchParams();
  query.set("from_date", params.from);
  query.set("to_date", params.to);
  return query.toString();
}

export function buildStockMovementApiQuery(params: StockMovementSearchParams) {
  const query = new URLSearchParams();
  query.set("from", toApiDateTime(params.from, "start"));
  query.set("to", toApiDateTime(params.to, "end"));
  if (params.product_id) query.set("product_id", params.product_id);
  if (params.type !== "all") query.set("type", params.type);
  query.set("limit", params.limit.toString());
  query.set("offset", params.offset.toString());
  return query.toString();
}

export function buildExportDateTimeQuery(params: Pick<ReportSearchParams, "from" | "to">) {
  return new URLSearchParams({
    from_date: params.from,
    to_date: params.to,
  }).toString();
}

export function averageTicket(totalSales: string, salesCount: number) {
  if (salesCount <= 0) return "0";
  return (Number(totalSales) / salesCount).toFixed(2);
}

function rangeToDates(range: Exclude<ReportRangePreset, "custom">, now: Date) {
  const to = toDateInput(now);
  const fromDate = new Date(now);

  if (range === "today") {
    return { from: to, to };
  }

  if (range === "month") {
    fromDate.setDate(1);
    return { from: toDateInput(fromDate), to };
  }

  fromDate.setDate(fromDate.getDate() - (range === "7d" ? 6 : 29));
  return { from: toDateInput(fromDate), to };
}

function toApiDateTime(value: string, boundary: "start" | "end") {
  return `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}Z`;
}

function normalizeDateInput(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : value;
}

function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function optionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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
