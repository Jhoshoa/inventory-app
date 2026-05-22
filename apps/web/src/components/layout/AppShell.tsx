import type { Session } from "@/lib/auth/session";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

export function AppShell({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppSidebar role={session.role} />
      <div className="min-h-screen lg:pl-64">
        <AppHeader session={session} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
