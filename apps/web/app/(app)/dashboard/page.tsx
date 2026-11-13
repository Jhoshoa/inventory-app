import { HomeOverview } from "@/features/dashboard/components/HomeOverview";
import { getDashboardSummary, getSalesTotals } from "@/features/dashboard/api";
import { boliviaToday, comparisonRange, parseHomePeriod, periodRange } from "@/features/dashboard/home";
import { listStorefrontRequests } from "@/features/storefront-requests/api";
import { loadShellStatus } from "@/components/layout/shellStatus";
import { requireSession } from "@/lib/auth/session";

// Inicio (tableros "A · Inicio"). Cada dato es opcional: si una llamada falla,
// el resto de la página se muestra igual.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const period = parseHomePeriod(rawParams.scope);
  const session = await requireSession();
  const today = boliviaToday();
  const range = periodRange(period, today);
  const comparison = comparisonRange(period, today);

  const [summary, sales, previousSales, pending, shell] = await Promise.all([
    period === "7d" ? getDashboardSummary("custom", range) : getDashboardSummary(period === "month" ? "month" : "today"),
    getSalesTotals(range).catch(() => null),
    getSalesTotals(comparison).catch(() => null),
    listStorefrontRequests(50, 0, "pending").catch(() => null),
    loadShellStatus(session.role),
  ]);

  const pendingItems = pending?.ok ? pending.data.items : [];
  return (
    <HomeOverview
      session={session}
      data={{
        period,
        today,
        summary,
        sales,
        previousSales,
        comparisonLabel: comparison.label,
        pendingOrders: pending?.ok
          ? {
              count: pending.data.pending_count,
              // La lista viene de la más nueva a la más antigua.
              oldestAt: pendingItems.at(-1)?.created_at ?? null,
            }
          : null,
        cash: shell.cash,
      }}
    />
  );
}
