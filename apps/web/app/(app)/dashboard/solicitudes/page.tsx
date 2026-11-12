import type { Metadata } from "next";
import { MoreParentLink } from "@/components/layout/MoreParentLink";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { getStore } from "@/features/settings/api";
import { listStorefrontRequests } from "@/features/storefront-requests/api";
import { OrdersBrowser } from "@/features/storefront-requests/components/OrdersBrowser";
import { parseOrderTab } from "@/features/storefront-requests/list";
import { canManageSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Pedidos" };

// Pedidos del catálogo (tablero P07): pendientes por defecto; ?estado= viene de las pestañas.
export default async function StorefrontRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const tab = parseOrderTab((await searchParams).estado);
  const [session, requests, store] = await Promise.all([
    requireSession(),
    listStorefrontRequests(50, 0, tab === "all" ? undefined : tab),
    getStore().catch(() => null),
  ]);

  if (!requests.ok) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <MoreParentLink />
          <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Pedidos</h1>
        </div>
        <DataFetchError resource="los pedidos" error={requests.error.message} />
      </div>
    );
  }

  return (
    <OrdersBrowser
      initialTab={tab}
      initialData={requests.data}
      storeName={store?.name ?? ""}
      catalogSlug={store?.storefront_enabled && store.storefront_slug ? store.storefront_slug : null}
      canManageCatalog={canManageSettings(session.role)}
    />
  );
}
