import { DashboardOverview } from "@/features/dashboard/components/DashboardOverview";
import { getDashboardSummary } from "@/features/dashboard/api";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return <DashboardOverview summary={summary} />;
}
