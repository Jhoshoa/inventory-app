export function validateStoreDayNote(value: FormDataEntryValue | null) {
  if (value === null) return "";
  if (typeof value !== "string") return "";
  const note = value.trim();
  if (note.length > 255) return "La nota debe tener maximo 255 caracteres";
  return "";
}

export function noteValue(formData: FormData) {
  const value = formData.get("note");
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function validateMoneyAmount(value: FormDataEntryValue | null, label: string, required = false) {
  if (value === null || value === "") return required ? `${label} es requerido` : "";
  if (typeof value !== "string") return `${label} no es valido`;
  const normalized = value.trim();
  if (!normalized) return required ? `${label} es requerido` : "";
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return `${label} debe tener maximo 2 decimales`;
  if (Number(normalized) < 0) return `${label} no puede ser negativo`;
  return "";
}

export function moneyValue(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim();
}

const cashMovementTypes = new Set(["cash_in", "cash_out", "expense", "deposit", "withdrawal"]);

export function validateCashMovementType(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !cashMovementTypes.has(value)) {
    return "Tipo de movimiento no es valido";
  }
  return "";
}
