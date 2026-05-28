import type { Session } from "@/lib/auth/session";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { PageContainer } from "./PageContainer";

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
        <PageContainer>{children}</PageContainer>
      </div>
    </div>
  );
}
