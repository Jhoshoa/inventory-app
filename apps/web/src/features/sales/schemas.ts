export function validateVoidSale(reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) return { reason: "La razon es requerida" };
  if (trimmed.length > 200) return { reason: "La razon debe tener maximo 200 caracteres" };
  return {};
}
