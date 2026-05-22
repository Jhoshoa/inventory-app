import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { listProductCategories } from "@/features/product-categories/api";
import { SettingsOverview } from "@/features/settings/components/SettingsOverview";
import { getCurrentClosingPreview, getCurrentStoreDay, getCurrentStoreDayEvents, listCashMovements } from "@/features/store-day/api";
import { canViewSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await requireSession();
  if (!canViewSettings(session.role)) {
    return <ForbiddenState description="Ajustes requiere permisos de owner." />;
  }
  const [storeDay, storeDayEvents, productCategories] = await Promise.all([
    getCurrentStoreDay(),
    getCurrentStoreDayEvents(),
    listProductCategories(true),
  ]);
  const closingPreview = storeDay.ok && storeDay.data.status === "open"
    ? await getCurrentClosingPreview()
    : undefined;
  const cashMovements = storeDay.ok && storeDay.data.id
    ? await listCashMovements({ business_day_id: storeDay.data.id, limit: 20, offset: 0 })
    : undefined;
  return (
    <SettingsOverview
      session={session}
      storeDay={storeDay}
      storeDayEvents={storeDayEvents}
      closingPreview={closingPreview}
      cashMovements={cashMovements}
      productCategories={productCategories}
    />
  );
}
