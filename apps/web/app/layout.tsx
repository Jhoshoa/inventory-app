import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inventory App",
  description: "Administracion de inventario",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-950 antialiased">{children}</body>
    </html>
  );
}
