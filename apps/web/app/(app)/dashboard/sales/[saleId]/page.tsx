import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { getSale } from "@/features/sales/api";
import { SaleDetail } from "@/features/sales/components/SaleDetail";
import { businessDateKey } from "@/features/sales/list";
import { getStore } from "@/features/settings/api";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Venta" };

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;
  const [session, sale, store] = await Promise.all([requireSession(), getSale(saleId), getStore().catch(() => null)]);

  if (!sale.ok && (sale.error.status === 404 || sale.error.status === 422)) notFound();
  if (!sale.ok) return <DataFetchError resource="la venta" error={sale.error.message} />;

  return (
    <SaleDetail
      sale={sale.data}
      role={session.role}
      store={{ name: store?.name ?? "", address: store?.address, phone: store?.phone, logoUrl: store?.storefront_logo_url }}
      today={businessDateKey()}
    />
  );
}
