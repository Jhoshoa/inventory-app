import type { Metadata } from "next";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { getStore } from "@/features/settings/api";
import { DiscountPolicyForm } from "@/features/settings/components/DiscountPolicyForm";
import { SettingsHeader } from "@/features/settings/components/SettingsHeader";
import { canManageSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Precios y descuentos" };

export default async function DiscountPolicyPage() {
  const session = await requireSession();
  if (!canManageSettings(session.role)) {
    return <ForbiddenState description="Solo el dueño de la tienda puede cambiar los descuentos." />;
  }
  const store = await getStore().catch((error: unknown) => (error instanceof Error ? error : new Error("No se pudo leer la tienda")));
  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader section="precios" description="Límites para los descuentos al cobrar y en los productos." />
      {store instanceof Error ? <DataFetchError resource="los descuentos" error={store.message} /> : <DiscountPolicyForm store={store} />}
    </div>
  );
}
