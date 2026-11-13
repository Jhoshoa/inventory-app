import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { loadShellStatus } from "@/components/layout/shellStatus";
import { requireSession } from "@/lib/auth/session";
import { inter } from "@/lib/fonts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const status = await loadShellStatus(session.role);

  return (
    <div className={inter.variable}>
      <AppShell session={session} status={status}>
        {children}
      </AppShell>
    </div>
  );
}
