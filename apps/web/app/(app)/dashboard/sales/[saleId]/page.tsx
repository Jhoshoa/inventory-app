import { notFound } from "next/navigation";
import { PageSection } from "@/components/layout/PageSection";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { getSale } from "@/features/sales/api";
import { SaleDetail } from "@/features/sales/components/SaleDetail";
import { requireSession } from "@/lib/auth/session";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;
  const [session, sale] = await Promise.all([requireSession(), getSale(saleId)]);

  if (!sale.ok && sale.error.status === 404) notFound();

  return (
    <PageSection className="space-y-6">
      {!sale.ok ? (
        <DataFetchError resource="la venta" error={sale.error.message} />
      ) : (
        <SaleDetail sale={sale.data} role={session.role} />
      )}
    </PageSection>
  );
}
