/**
 * Lee el vencimiento (`exp`, en segundos) de un JWT SIN verificar su firma.
 * Solo sirve para decidir cuando renovar la sesion; el backend es quien valida
 * el token de verdad. Devuelve null si no es un JWT (p. ej. los tokens de
 * desarrollo, que son un UUID y no vencen).
 */
export function decodeJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const claims: unknown = JSON.parse(atob(padded));
    if (claims && typeof claims === "object" && "exp" in claims) {
      const exp = (claims as { exp: unknown }).exp;
      return typeof exp === "number" && Number.isFinite(exp) ? exp : null;
    }
  } catch {
    // token mal formado
  }
  return null;
}
