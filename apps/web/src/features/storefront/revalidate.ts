import { revalidateTag } from "next/cache";
import { apiRequest } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import { storefrontCacheTag } from "./api";

/**
 * Renueva la cache del catalogo publico de la tienda de la sesion.
 *
 * El catalogo se sirve desde cache (5 min). Sin esto, un precio, descuento o
 * stock editado en el panel seguia viejo en el catalogo, y el cliente veia en
 * su boleta un precio distinto al que el backend usa al registrar el pedido.
 * Se llama despues de cada cambio que se ve en el catalogo.
 */
export async function revalidateStorefrontCatalog(): Promise<void> {
  const token = await getAuthToken();
  if (!token) return;
  const result = await apiRequest<{ storefront_slug: string | null }>("/store", { token });
  if (result.ok && result.data.storefront_slug) {
    revalidateTag(storefrontCacheTag(result.data.storefront_slug));
  }
}
