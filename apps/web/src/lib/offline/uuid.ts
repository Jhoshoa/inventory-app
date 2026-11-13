/**
 * UUID v4 para ids locales (venta sin conexión, este equipo).
 *
 * `crypto.randomUUID` solo existe en contextos seguros (https o localhost): abierta por
 * la IP de la red (http://192.168.x.x) no está, y la venta sin conexión fallaba.
 * `getRandomValues` sí está en todos lados.
 */
export function randomUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
