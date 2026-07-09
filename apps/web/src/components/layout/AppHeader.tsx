import { LogOut, Store } from "lucide-react";
import type { Session } from "@/lib/auth/session";
import { LogoutButton } from "@/features/auth/components/LogoutButton";
import { Badge } from "@/components/ui/Badge";
import { MobileNavDrawer } from "./MobileNavDrawer";

const SUBSCRIPTION_LABELS: Record<string, string> = {
  trial: "Prueba",
  active: "Suscripto",
  past_due: "Vencido",
  expired: "Suspendido",
};

const SUBSCRIPTION_VARIANTS: Record<string, "info" | "success" | "warning" | "danger"> = {
  trial: "info",
  active: "success",
  past_due: "warning",
  expired: "danger",
};

export function AppHeader({ session }: { session: Session }) {
  const subLabel = session.subscriptionStatus
    ? SUBSCRIPTION_LABELS[session.subscriptionStatus] ?? session.subscriptionStatus
    : null;
  const subVariant = session.subscriptionStatus
    ? SUBSCRIPTION_VARIANTS[session.subscriptionStatus] ?? "default"
    : "default";

  return (
    <header className="sticky top-0 z-20 border-b border-app-border bg-app-surface/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <MobileNavDrawer role={session.role} />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-text-strong">
              <Store className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
              <span className="truncate">{session.storeName}</span>
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-text-muted">
              <span>{session.email} - {session.role}</span>
              {subLabel ? <Badge variant={subVariant}>{subLabel}</Badge> : null}
            </p>
          </div>
        </div>
        <LogoutButton>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Salir
        </LogoutButton>
      </div>
    </header>
  );
}
