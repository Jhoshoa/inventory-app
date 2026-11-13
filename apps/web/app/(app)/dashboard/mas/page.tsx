import type { Metadata } from "next";
import { MorePage } from "@/components/layout/MorePage";
import { loadShellStatus } from "@/components/layout/shellStatus";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Más" };

export default async function MoreRoute() {
  const session = await requireSession();
  const status = await loadShellStatus(session.role);
  return <MorePage session={session} status={status} />;
}
