import { DashboardOverview } from "@/features/dashboard/components/DashboardOverview";
import { getDashboardSummary } from "@/features/dashboard/api";
import { getCurrentStoreDay } from "@/features/store-day/api";
import { requireSession } from "@/lib/auth/session";
import type { DashboardScope } from "@/features/dashboard/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const scope = parseScope(rawParams.scope);
  const session = await requireSession();
  const [summary, storeDay] = await Promise.all([
    getDashboardSummary(scope),
    getCurrentStoreDay(),
  ]);

  return <DashboardOverview summary={summary} storeDay={storeDay} role={session.role} scope={scope} />;
}

function parseScope(value: string | string[] | undefined): DashboardScope {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "month" ? "month" : "today";
}
