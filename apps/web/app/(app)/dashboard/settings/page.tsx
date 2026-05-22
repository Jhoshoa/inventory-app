import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { SettingsOverview } from "@/features/settings/components/SettingsOverview";
import { canViewSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await requireSession();
  if (!canViewSettings(session.role)) {
    return <ForbiddenState description="Ajustes requiere permisos de owner." />;
  }
  return <SettingsOverview session={session} />;
}
