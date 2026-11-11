const currencyFormatter = new Intl.NumberFormat("es-BO", {
  style: "currency",
  currency: "BOB",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

// Montos como los escribe la gente: "30", "30,5", "30,50" o "30.50".
// Sin separador de miles, hasta 2 decimales (igual que Numeric(12, 2) en la API).
const MONEY_INPUT = /^(\d+)(?:[.,](\d{1,2}))?$/;
export const MAX_MONEY_INTEGER_DIGITS = 10;

export type ParsedMoney =
  | { ok: true; value: string }
  | { ok: false; reason: "empty" | "format" | "too_long" };

/** Normaliza un monto escrito con coma o punto a "1234.50" para enviarlo a la API. */
export function parseMoney(input: string | null | undefined): ParsedMoney {
  const text = (input ?? "").trim();
  if (!text) return { ok: false, reason: "empty" };
  const match = MONEY_INPUT.exec(text);
  if (!match) return { ok: false, reason: "format" };
  const integer = match[1].replace(/^0+(?=\d)/, "");
  if (integer.length > MAX_MONEY_INTEGER_DIGITS) return { ok: false, reason: "too_long" };
  const decimals = match[2];
  return { ok: true, value: decimals ? `${integer}.${decimals}` : integer };
}
