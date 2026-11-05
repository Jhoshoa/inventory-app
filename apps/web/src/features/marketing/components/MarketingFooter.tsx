import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { BrandMark } from "./BrandLogo";

const FOOTER_LINKS = [
  { href: "/funcionalidades", label: "Funciones" },
  { href: "/precios", label: "Precios" },
  { href: "/contacto", label: "Contacto" },
  { href: "/legal/terminos", label: "Términos de servicio" },
  { href: "/legal/privacidad", label: "Política de privacidad" },
];

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t-[3px] border-mkt-ink bg-mkt-cobalt text-mkt-haze">
      <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-6 px-6 py-12 text-sm">
        <div className="max-w-[380px]">
          <div className="flex items-center gap-2.5 text-white">
            <BrandMark size={34} />
            <span className="font-display text-lg uppercase">{BRAND.name}</span>
          </div>
          <p className="mt-3 leading-relaxed">
            Inventario, ventas y cierre de caja para tiendas, almacenes y ferreterías en Bolivia.
          </p>
          <p className="mt-4 font-receipt text-xs">
            © {year} · {BRAND.domain}
          </p>
        </div>
        <nav aria-label="Pie de página" className="flex flex-wrap items-start gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-white underline-offset-4 hover:text-mkt-sun hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
