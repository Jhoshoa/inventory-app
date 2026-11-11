import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { listProductCategories } from "@/features/product-categories/api";
import { getStore } from "@/features/settings/api";
import { listStoreLocations } from "@/features/store-locations/api";
import { SettingsOverview } from "@/features/settings/components/SettingsOverview";
import { listUserInvitations, listUsers } from "@/features/users/api";
import { canViewSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await requireSession();
  if (!canViewSettings(session.role)) {
    return <ForbiddenState description="Solo el dueño de la tienda puede entrar a Configuración." />;
  }
  const [storeData, productCategories, storeLocations, users, userInvitations] = await Promise.all([
    getStore().catch(() => null),
    listProductCategories(true),
    listStoreLocations(),
    listUsers(),
    listUserInvitations(),
  ]);
  return (
    <SettingsOverview
      session={session}
      storeData={storeData ?? undefined}
      productCategories={productCategories}
      storeLocations={storeLocations}
      users={users}
      userInvitations={userInvitations}
    />
  );
}
