import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
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
    <section className="space-y-6">
      <Button variant="secondary" asChild>
        <Link href="/dashboard/sales">Volver a ventas</Link>
      </Button>
      {!sale.ok ? (
        <Alert variant="error">No se pudo cargar la venta: {sale.error.message}</Alert>
      ) : (
        <SaleDetail sale={sale.data} role={session.role} />
      )}
    </section>
  );
}
