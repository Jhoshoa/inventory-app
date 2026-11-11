import { listStorefrontRequests } from "@/features/storefront-requests/api";
import { getCurrentClosingPreview, getCurrentStoreDay } from "@/features/store-day/api";
import { canOpenCloseStore } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";

/** Lo que el marco del panel muestra en todas las páginas: caja y pedidos sin responder. */
export interface ShellStatus {
  pendingOrders: number | null;
  cash: {
    isOpen: boolean;
    openedAt: string | null;
    // Solo el dueño ve montos de caja.
    expectedCash: string | null;
  } | null;
}

export const EMPTY_SHELL_STATUS: ShellStatus = { pendingOrders: null, cash: null };

/** Nunca falla: si la API no responde, el marco se muestra sin esos datos. */
export async function loadShellStatus(role: UserRole): Promise<ShellStatus> {
  const [requests, storeDay] = await Promise.all([
    listStorefrontRequests(1, 0).catch(() => null),
    getCurrentStoreDay().catch(() => null),
  ]);
  const isOpen = storeDay?.ok ? storeDay.data.status === "open" : null;
  let expectedCash: string | null = null;
  if (isOpen && canOpenCloseStore(role)) {
    const preview = await getCurrentClosingPreview().catch(() => null);
    expectedCash = preview?.ok ? preview.data.expected_cash_amount : null;
  }
  return {
    pendingOrders: requests?.ok ? requests.data.pending_count : null,
    cash:
      storeDay?.ok && isOpen !== null
        ? { isOpen, openedAt: storeDay.data.opened_at, expectedCash }
        : null,
  };
}
