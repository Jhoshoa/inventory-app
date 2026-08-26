import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { getBillingHistory, getBillingStatus } from "@/features/settings/api/billing";
import { BillingHistoryTable } from "@/features/settings/components/BillingHistoryTable";
import { BillingSettings } from "@/features/settings/components/BillingSettings";
import { requireSession } from "@/lib/auth/session";

export default async function BillingPage() {
  const session = await requireSession();
  if (session.role !== "owner") {
    return <ForbiddenState description="Facturacion requiere permisos de owner." />;
  }

  const [billing, history] = await Promise.all([getBillingStatus(), getBillingHistory()]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Ajustes", href: "/dashboard/settings" },
              { label: "Suscripcion" },
            ]}
          />
        }
        title="Suscripcion y facturacion"
        description="Estado de tu plan, periodo de prueba y proximos pagos."
      />
      <BillingSettings billing={billing} session={session} />
      <BillingHistoryTable entries={history} />
    </div>
  );
}
