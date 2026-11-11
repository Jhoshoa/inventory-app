import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { StoreDayEventTimeline } from "@/features/store-day/components/StoreDayEventTimeline";
import { StoreDayStatusPanel } from "@/features/store-day/components/StoreDayStatusPanel";
import {
  getCurrentClosingPreview,
  getCurrentStoreDay,
  getCurrentStoreDayEvents,
  listCashMovements,
} from "@/features/store-day/api";
import { canOpenCloseStore, canViewCashMovements } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Caja" };

// Caja y jornada: lo que antes estaba en Ajustes › Operación diaria. La Fase 2
// del plan la rehace con el diseño del tablero P09 (abrir, movimientos, cerrar).
export default async function CashRegisterPage() {
  const session = await requireSession();
  const owner = canOpenCloseStore(session.role);
  const storeDay = await getCurrentStoreDay();
  const isOpen = storeDay.ok && storeDay.data.status === "open";
  const [events, closingPreview, cashMovements] = await Promise.all([
    owner ? getCurrentStoreDayEvents() : Promise.resolve(undefined),
    owner && isOpen ? getCurrentClosingPreview() : Promise.resolve(undefined),
    canViewCashMovements(session.role) && storeDay.ok && storeDay.data.id
      ? listCashMovements({ business_day_id: storeDay.data.id, limit: 20, offset: 0 })
      : Promise.resolve(undefined),
  ]);

  return (
    <>
      <PageHeader
        title="Caja"
        description={
          owner
            ? "Abre y cierra la caja del día y registra entradas y salidas de efectivo."
            : "Si la caja está abierta se puede vender. El dueño la abre y la cierra."
        }
      />
      {storeDay.ok ? (
        <StoreDayStatusPanel
          storeDay={storeDay.data}
          role={session.role}
          actions={owner ? "manage" : "none"}
          closingPreview={closingPreview}
          cashMovements={cashMovements}
        />
      ) : (
        <DataFetchError resource="el estado de la caja" error={storeDay.error.message} />
      )}
      {owner && events ? (
        <StoreDayEventTimeline events={events} timezone={storeDay.ok ? storeDay.data.timezone : undefined} />
      ) : null}
    </>
  );
}
