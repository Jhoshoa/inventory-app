// Mensajes de la API en palabras de la tienda y adónde ir después de entrar (tablero P13).

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function authErrorMessage(status: number, message: string | undefined, fallback: string) {
  if (status === 429) return "Demasiados intentos. Espera unos minutos y vuelve a intentar.";
  const text = (message ?? "").toLowerCase();
  if (text.includes("email not confirmed") || text.includes("no confirmado")) return "Confirma tu correo antes de entrar: revisa tu bandeja de entrada.";
  if (status === 401) return "Correo o contraseña incorrectos.";
  return message || fallback;
}

/** Dueño → Inicio. Cajero → Vender si la caja está abierta; si no, Inicio. */
export async function destinationAfterLogin(role: string | null | undefined) {
  if (role !== "cashier") return "/dashboard";
  try {
    const response = await fetch("/api/store-day/current", { cache: "no-store" });
    if (!response.ok) return "/dashboard";
    const day = (await response.json()) as { status?: string };
    return day.status === "open" ? "/dashboard/pos" : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

/** El correo del enlace de recuperación (el token es un JWT; solo se lee para mostrarlo). */
export function emailFromAccessToken(token: string | null) {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { email?: unknown };
    return typeof json.email === "string" ? json.email : null;
  } catch {
    return null;
  }
}
