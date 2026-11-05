"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { BrandLogo } from "./BrandLogo";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/funcionalidades", label: "Funciones" },
  { href: "/precios", label: "Precios" },
  { href: "/contacto", label: "Contacto" },
];

const PRIMARY_PILL =
  "rounded-full border-2 border-mkt-ink bg-mkt-sun px-5 py-3 text-[15px] font-bold text-mkt-ink transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white";
const NAV_LINK =
  "rounded-sm text-[15px] font-semibold text-white hover:text-mkt-sun focus:outline-none focus-visible:ring-2 focus-visible:ring-white";

export function MarketingHeader({ hasSession }: { hasSession: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-mkt-cobalt text-white">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-6 py-3.5">
        <Link
          href="/"
          aria-label={`${BRAND.name}, inicio`}
          className="rounded-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <BrandLogo />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-[26px] md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={NAV_LINK}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {hasSession ? (
            <Link href="/dashboard" className={PRIMARY_PILL}>
              Ir a mi panel
            </Link>
          ) : (
            <>
              <Link href="/login" className={`${NAV_LINK} p-3`}>
                Iniciar sesión
              </Link>
              <Link href="/register" className={PRIMARY_PILL}>
                Probar gratis
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-mkt-sun md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="marketing-mobile-menu"
          aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {mobileOpen ? (
        <div id="marketing-mobile-menu" className="border-t-2 border-mkt-ink/30 px-6 pb-6 pt-2 md:hidden">
          <nav aria-label="Principal" className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border-b border-white/20 py-3.5 text-lg font-semibold text-white"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 flex flex-col gap-3">
            {hasSession ? (
              <Link href="/dashboard" className={`${PRIMARY_PILL} text-center`} onClick={() => setMobileOpen(false)}>
                Ir a mi panel
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className={`${PRIMARY_PILL} text-center`}
                  onClick={() => setMobileOpen(false)}
                >
                  Probar gratis
                </Link>
                <Link
                  href="/login"
                  className="rounded-full border-2 border-white px-5 py-3 text-center text-[15px] font-bold text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
