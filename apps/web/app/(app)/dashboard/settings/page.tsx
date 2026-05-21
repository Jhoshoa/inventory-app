import { SettingsOverview } from "@/features/settings/components/SettingsOverview";
import { requireSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await requireSession();
  return <SettingsOverview session={session} />;
}
