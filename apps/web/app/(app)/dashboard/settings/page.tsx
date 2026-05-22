import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { SettingsOverview } from "@/features/settings/components/SettingsOverview";
import { getCurrentStoreDay, getCurrentStoreDayEvents } from "@/features/store-day/api";
import { canViewSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await requireSession();
  if (!canViewSettings(session.role)) {
    return <ForbiddenState description="Ajustes requiere permisos de owner." />;
  }
  const [storeDay, storeDayEvents] = await Promise.all([
    getCurrentStoreDay(),
    getCurrentStoreDayEvents(),
  ]);
  return <SettingsOverview session={session} storeDay={storeDay} storeDayEvents={storeDayEvents} />;
}
