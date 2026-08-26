import { MarketingFooter } from "@/features/marketing/components/MarketingFooter";
import { MarketingHeader } from "@/features/marketing/components/MarketingHeader";
import { WhatsAppFloatingButton } from "@/features/marketing/components/WhatsAppFloatingButton";
import { getSession } from "@/lib/auth/session";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="flex min-h-screen flex-col bg-app-background">
      <MarketingHeader hasSession={Boolean(session)} />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
