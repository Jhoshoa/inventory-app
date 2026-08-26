import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/Toaster";
import { BRAND } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  applicationName: BRAND.name,
  title: {
    default: `${BRAND.tagline} | ${BRAND.name}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "es_BO",
    siteName: BRAND.name,
    title: `${BRAND.tagline} | ${BRAND.name}`,
    description: BRAND.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.tagline} | ${BRAND.name}`,
    description: BRAND.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-app-background text-text-strong antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
