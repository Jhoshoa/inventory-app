import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { requireSession } from "@/lib/auth/session";

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

  return <AppShell session={session}>{children}</AppShell>;
}
