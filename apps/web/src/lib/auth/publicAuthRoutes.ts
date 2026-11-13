/**
 * Lo único de Supabase Auth que abre el navegador, y que la web reenvía al gateway
 * interno (inventory-auth-gateway): los enlaces de los correos y la ida y vuelta de
 * Google. El resto de Auth (login, admin...) lo usa solo la API por la red interna,
 * así que desde internet no se puede llegar.
 */
export const PUBLIC_AUTH_PATHS = ["/auth/v1/verify", "/auth/v1/authorize", "/auth/v1/callback"] as const;

export function authRewrites(gatewayUrl: string | undefined) {
  const base = (gatewayUrl ?? "").trim().replace(/\/+$/, "");
  if (!base) return [];
  return PUBLIC_AUTH_PATHS.map((path) => ({ source: path, destination: `${base}${path}` }));
}
