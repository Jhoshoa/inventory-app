import type { Metadata } from "next";
import { inter } from "@/lib/fonts";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Entrar, crear tienda y contraseña: el mismo estilo A del panel.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} theme-app min-h-screen font-app`}>{children}</div>;
}
