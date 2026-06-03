import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Inventory App",
  title: {
    default: "Inventory App",
    template: "%s | Inventory App",
  },
  description: "Herramienta operativa para inventario, ventas, reportes e importacion asistida.",
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
