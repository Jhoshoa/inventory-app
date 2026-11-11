import type { Session } from "@/lib/auth/session";
import { TrialBanner } from "@/features/trial/components/TrialBanner";
import { AppSidebar } from "./AppSidebar";
import { ConnectionStrip } from "./ConnectionStrip";
import { MobileTabBar } from "./MobileTabBar";
import { PageContainer } from "./PageContainer";
import { ShellFrame } from "./ShellFrame";
import { ShortcutKeys } from "./ShortcutKeys";
import { EMPTY_SHELL_STATUS, type ShellStatus } from "./shellStatus";

export function AppShell({
  children,
  session,
  status = EMPTY_SHELL_STATUS,
}: {
  children: React.ReactNode;
  session: Session;
  status?: ShellStatus;
}) {
  return (
    <div className="theme-app min-h-screen font-app">
      <ShortcutKeys />
      <AppSidebar session={session} status={status} />
      <ShellFrame>
        <div className="print-hidden mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 pt-3 empty:hidden sm:px-6 lg:px-8">
          <ConnectionStrip />
          <TrialBanner
            subscriptionStatus={session.subscriptionStatus}
            daysUntilTrialEnds={session.daysUntilTrialEnds}
            graceDaysRemaining={null}
          />
        </div>
        <PageContainer>{children}</PageContainer>
      </ShellFrame>
      <MobileTabBar pendingOrders={status.pendingOrders} />
    </div>
  );
}
