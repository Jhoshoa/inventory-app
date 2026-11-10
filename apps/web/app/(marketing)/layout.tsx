import localFont from "next/font/local";
import { MarketingFooter } from "@/features/marketing/components/MarketingFooter";
import { MarketingHeader } from "@/features/marketing/components/MarketingHeader";
import { WhatsAppFloatingButton } from "@/features/marketing/components/WhatsAppFloatingButton";
import { getSession } from "@/lib/auth/session";

// Fuentes guardadas en el repo (src/fonts): el build no depende de Google Fonts,
// que desde el servidor de deploy respondia URLs que next/font/google no sabia
// leer. Se sirven desde el propio sitio, como exige el CSP (font-src 'self').
const archivo = localFont({
  src: "../../src/fonts/archivo-latin-wght.woff2",
  weight: "100 900",
  variable: "--font-archivo",
  display: "swap",
});
const archivoBlack = localFont({
  src: "../../src/fonts/archivo-black-latin-400.woff2",
  weight: "400",
  variable: "--font-display",
  display: "swap",
});
const jetbrainsMono = localFont({
  src: "../../src/fonts/jetbrains-mono-latin-wght.woff2",
  weight: "100 800",
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
