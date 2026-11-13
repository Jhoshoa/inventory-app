import type { Metadata } from "next";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { getBillingHistory, getBillingStatus } from "@/features/settings/api/billing";
import { PlanOverview } from "@/features/settings/components/PlanOverview";
import { SettingsHeader } from "@/features/settings/components/SettingsHeader";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Plan y pagos" };

// Plan y pagos (tablero P12, solo el dueño).
export default async function BillingPage() {
  const session = await requireSession();
  if (session.role !== "owner") {
    return <ForbiddenState description="Solo el dueño de la tienda puede ver el plan y los pagos." />;
  }

  const [billing, history] = await Promise.all([
    getBillingStatus().catch((error: unknown) => (error instanceof Error ? error : new Error("No se pudo leer el plan"))),
    getBillingHistory().catch(() => []),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader section="plan" />
      {billing instanceof Error ? <DataFetchError resource="tu plan" error={billing.message} /> : <PlanOverview billing={billing} history={history} />}
    </div>
  );
}
