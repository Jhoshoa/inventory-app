import type { Metadata } from "next";
import { DataFetchError } from "@/components/ui/DataFetchError";
import { CashRegisterView } from "@/features/store-day/cash/CashRegisterView";
import {
  getCurrentClosingPreview,
  getCurrentStoreDay,
  getCurrentStoreDayEvents,
  listCashMovements,
  listCloseReports,
} from "@/features/store-day/api";
import { listUsers } from "@/features/users/api";
import { canOpenCloseStore } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Caja" };

// Caja y jornada (tablero P09): abrir, movimientos, cerrar y reabrir. El cajero
// solo ve si está abierta; montos, movimientos e historial son del dueño.
export default async function CashRegisterPage() {
  const session = await requireSession();
  const owner = canOpenCloseStore(session.role);
  const storeDay = await getCurrentStoreDay();

  if (!storeDay.ok) {
    return <DataFetchError resource="el estado de la caja" error={storeDay.error.message} />;
  }
  if (!owner) {
    return (
      <CashRegisterView
        role={session.role}
        data={{ storeDay: storeDay.data, preview: null, movements: null, events: null, lastClose: null, names: {} }}
      />
    );
  }

  const isOpen = storeDay.data.status === "open";
  const dayId = storeDay.data.id;
  const [preview, movements, events, lastClose, users] = await Promise.all([
    isOpen ? getCurrentClosingPreview() : Promise.resolve(null),
    dayId ? listCashMovements({ business_day_id: dayId, include_voided: true, limit: 100, offset: 0 }) : Promise.resolve(null),
    dayId ? getCurrentStoreDayEvents() : Promise.resolve(null),
    listCloseReports({ limit: 1, offset: 0 }),
    listUsers(100, 0),
  ]);

  const names = users.ok
    ? Object.fromEntries(users.data.items.map((user) => [user.id, user.full_name || user.email.split("@")[0]]))
    : {};

  return (
    <CashRegisterView
      role={session.role}
      data={{
        storeDay: storeDay.data,
        preview: preview?.ok ? preview.data : null,
        movements: movements === null ? [] : movements.ok ? movements.data.items : null,
        events: events === null ? [] : events.ok ? events.data : null,
        lastClose: lastClose.ok ? (lastClose.data.items[0] ?? null) : null,
        names,
      }}
    />
  );
}
