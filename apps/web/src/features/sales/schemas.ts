import type { SaleSearchParams, SaleStatusFilter } from "./types";

export const DEFAULT_SALE_LIMIT = 50;

const saleStatuses = new Set<SaleStatusFilter>(["all", "completed", "voided"]);

export function validateVoidSale(reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) return { reason: "La razon es requerida" };
  if (trimmed.length > 200) return { reason: "La razon debe tener maximo 200 caracteres" };
  return {};
}

export function parseSalesSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): SaleSearchParams {
  const statusValue = firstValue(searchParams.status);
  return {
    from_date: normalizeDateInput(firstValue(searchParams.from_date)),
    to_date: normalizeDateInput(firstValue(searchParams.to_date)),
    status: saleStatuses.has(statusValue as SaleStatusFilter) ? (statusValue as SaleStatusFilter) : "all",
    limit: parseBoundedInteger(firstValue(searchParams.limit), DEFAULT_SALE_LIMIT, 1, 100),
    offset: parseBoundedInteger(firstValue(searchParams.offset), 0, 0, 100_000),
  };
}

export function buildSalesApiQuery(params: SaleSearchParams) {
  const query = new URLSearchParams();
  if (params.from_date) query.set("from_date", params.from_date);
  if (params.to_date) query.set("to_date", params.to_date);
  if (params.status !== "all") query.set("status", params.status);
  query.set("limit", params.limit.toString());
  query.set("offset", params.offset.toString());
  return query.toString();
}

function normalizeDateInput(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : value;
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
