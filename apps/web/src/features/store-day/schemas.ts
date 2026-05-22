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
