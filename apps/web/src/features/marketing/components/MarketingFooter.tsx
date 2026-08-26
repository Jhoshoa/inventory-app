import Link from "next/link";
import { BRAND } from "@/lib/brand";

const FOOTER_LINKS = [
  { href: "/funcionalidades", label: "Funcionalidades" },
  { href: "/precios", label: "Precios" },
  { href: "/contacto", label: "Contacto" },
  { href: "/legal/terminos", label: "Terminos de servicio" },
  { href: "/legal/privacidad", label: "Politica de privacidad" },
];

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-app-border bg-app-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-sm space-y-2">
            <p className="text-lg font-semibold text-text-strong">{BRAND.name}</p>
            <p className="text-sm text-text-muted">{BRAND.description}</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 sm:justify-end">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-text-body hover:text-text-strong">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-8 border-t border-app-border pt-6 text-xs text-text-muted">
          © {year} {BRAND.legalName}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
