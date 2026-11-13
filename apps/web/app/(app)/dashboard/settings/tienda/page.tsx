import type { Metadata } from "next";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { getStore } from "@/features/settings/api";
import { SettingsHeader } from "@/features/settings/components/SettingsHeader";
import { StoreDataForm } from "@/features/settings/components/StoreDataForm";
import { canManageSettings } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Datos de la tienda" };

export default async function StoreDataPage() {
  const session = await requireSession();
  if (!canManageSettings(session.role)) {
    return <ForbiddenState description="Solo el dueño de la tienda puede cambiar sus datos." />;
  }
  const store = await getStore().catch((error: unknown) => (error instanceof Error ? error : new Error("No se pudo leer la tienda")));
  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader section="tienda" description="Nombre, dirección y teléfono salen en el recibo de cada venta." />
      {store instanceof Error ? <DataFetchError resource="los datos de la tienda" error={store.message} /> : <StoreDataForm store={store} />}
    </div>
  );
}
