import type { Session } from "@/lib/auth/session";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { PageContainer } from "./PageContainer";
import { TrialBanner } from "@/features/trial/components/TrialBanner";

export function AppShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session;
}) {
  return (
    <div className="min-h-screen bg-app-background">
      <AppSidebar role={session.role} />
      <div className="min-h-screen lg:pl-64">
        <AppHeader session={session} />
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
          <TrialBanner
            subscriptionStatus={session.subscriptionStatus}
            daysUntilTrialEnds={session.daysUntilTrialEnds}
            daysUntilNextBilling={null}
            graceDaysRemaining={null}
          />
        </div>
        <PageContainer>{children}</PageContainer>
      </div>
    </div>
  );
}
