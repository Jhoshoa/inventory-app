import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "App Inventario",
  title: {
    default: "App Inventario",
    template: "%s | App Inventario",
  },
  description: "Herramienta operativa para inventario, ventas, reportes e importacion asistida.",
  icons: {
    icon: "/favicon.svg",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-app-background text-text-strong antialiased">{children}</body>
    </html>
  );
}
