import { DashboardOverview } from "@/features/dashboard/components/DashboardOverview";
import { getDashboardSummary } from "@/features/dashboard/api";
import { getCurrentStoreDay } from "@/features/store-day/api";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await requireSession();
  const [summary, storeDay] = await Promise.all([
    getDashboardSummary(),
    getCurrentStoreDay(),
  ]);

  return <DashboardOverview summary={summary} storeDay={storeDay} role={session.role} />;
}
