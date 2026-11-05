import { Archivo, Archivo_Black, JetBrains_Mono } from "next/font/google";
import { MarketingFooter } from "@/features/marketing/components/MarketingFooter";
import { MarketingHeader } from "@/features/marketing/components/MarketingHeader";
import { WhatsAppFloatingButton } from "@/features/marketing/components/WhatsAppFloatingButton";
import { getSession } from "@/lib/auth/session";

// next/font las descarga al construir y las sirve desde el propio sitio: el CSP
// solo permite fuentes de 'self', asi que Google Fonts directo no cargaria.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});
const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-receipt",
  display: "swap",
});

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div
      className={`${archivo.variable} ${archivoBlack.variable} ${jetbrainsMono.variable} flex min-h-screen flex-col bg-mkt-paper font-archivo text-mkt-ink`}
    >
      <MarketingHeader hasSession={Boolean(session)} />
      <main className="flex-1 overflow-x-clip">{children}</main>
      <MarketingFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
