import type { Metadata } from "next";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { listStoreLocations } from "@/features/store-locations/api";
import { LocationManager } from "@/features/store-locations/components/LocationManager";
import { canManageProducts } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Lugares en la tienda" };

// Productos › Lugares en la tienda (tablero P01B). Crear, editar y eliminar es del
// dueño; el cajero ve "Dónde está" en cada producto, no esta pantalla.
export default async function StoreLocationsPage() {
  const session = await requireSession();
  if (!canManageProducts(session.role)) {
    return (
      <ForbiddenState
        description="Solo el dueño de la tienda puede ver y cambiar los lugares de la tienda."
        actionHref="/dashboard/products"
        actionLabel="Volver a Productos"
      />
    );
  }

  const locations = await listStoreLocations();
  return (
    <LocationManager
      locations={locations.ok ? locations.data.items : []}
      loadError={locations.ok ? null : locations.error.message}
    />
  );
}
