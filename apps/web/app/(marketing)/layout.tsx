import { MarketingFooter } from "@/features/marketing/components/MarketingFooter";
import { MarketingHeader } from "@/features/marketing/components/MarketingHeader";
import { WhatsAppFloatingButton } from "@/features/marketing/components/WhatsAppFloatingButton";
import { getSession } from "@/lib/auth/session";
import { publicFontVariables } from "@/lib/fonts";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div
      className={`${publicFontVariables} flex min-h-screen flex-col bg-mkt-paper font-archivo text-mkt-ink`}
    >
      <MarketingHeader hasSession={Boolean(session)} />
      <main className="flex-1 overflow-x-clip">{children}</main>
      <MarketingFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
