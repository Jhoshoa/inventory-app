import { MAX_MONEY_INTEGER_DIGITS, parseMoney } from "@/lib/format/currency";

export function validateStoreDayNote(value: FormDataEntryValue | null) {
  if (value === null) return "";
  if (typeof value !== "string") return "";
  const note = value.trim();
  if (note.length > 255) return "La nota debe tener máximo 255 caracteres";
  return "";
}

export function noteValue(formData: FormData) {
  const value = formData.get("note");
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

interface MoneyRules {
  required?: boolean;
  // Apertura y efectivo contado pueden ser 0; un movimiento no.
  allowZero?: boolean;
}

export function validateMoneyAmount(value: FormDataEntryValue | null, label: string, rules: MoneyRules = {}) {
  if (value !== null && typeof value !== "string") return `${label} no es válido`;
  const parsed = parseMoney(value);
  if (!parsed.ok) {
    if (parsed.reason === "empty") return rules.required ? `${label} es requerido` : "";
    if (parsed.reason === "too_long") return `${label} supera el máximo de ${MAX_MONEY_INTEGER_DIGITS} dígitos`;
    return `${label} debe ser un número con hasta 2 decimales (ej. 30,50)`;
  }
  if (!rules.allowZero && Number(parsed.value) === 0) return `${label} debe ser mayor a 0`;
  return "";
}

/** Monto listo para la API (con punto), o null si está vacío. Validar antes con validateMoneyAmount. */
export function moneyValue(formData: FormData, name: string) {
  const value = formData.get(name);
  const parsed = parseMoney(typeof value === "string" ? value : null);
  return parsed.ok ? parsed.value : null;
}

export const VOID_REASON_MAX_LENGTH = 255;

export function validateVoidReason(value: FormDataEntryValue | null) {
  const reason = typeof value === "string" ? value.trim() : "";
  if (!reason) return "Escribe por qué anulas el movimiento";
  if (reason.length > VOID_REASON_MAX_LENGTH) return `La razón debe tener máximo ${VOID_REASON_MAX_LENGTH} caracteres`;
  return "";
}

const cashMovementTypes = new Set(["cash_in", "cash_out", "expense", "deposit", "withdrawal"]);

export function validateCashMovementType(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !cashMovementTypes.has(value)) {
    return "Elige si es entrada o salida";
  }
  return "";
}
