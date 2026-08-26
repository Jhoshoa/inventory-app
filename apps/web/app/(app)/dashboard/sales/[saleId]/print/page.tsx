import { notFound } from "next/navigation";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { getSale } from "@/features/sales/api";
import { SalePrintView } from "@/features/sales/components/SalePrintView";
import { getStore } from "@/features/settings/api";
import { requireSession } from "@/lib/auth/session";

export default async function SalePrintPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;
  await requireSession();
  const [sale, store] = await Promise.all([getSale(saleId), getStore()]);

  if (!sale.ok && sale.error.status === 404) notFound();
  if (!sale.ok) {
    return (
      <div className="mx-auto max-w-md py-8">
        <DataFetchError resource="la venta" error={sale.error.message} />
      </div>
    );
  }

  return (
    <SalePrintView
      sale={sale.data}
      store={{
        name: store.name,
        address: store.address,
        phone: store.phone,
      }}
    />
  );
}
