"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/lib/brand";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/funcionalidades", label: "Funcionalidades" },
  { href: "/precios", label: "Precios" },
  { href: "/contacto", label: "Contacto" },
];

export function MarketingHeader({ hasSession }: { hasSession: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-app-border bg-app-surface/95 backdrop-blur supports-[backdrop-filter]:bg-app-surface/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-text-strong">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-700 text-sm font-bold text-text-inverse">
            {BRAND.name.slice(0, 1)}
          </span>
          {BRAND.name}
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-text-body hover:text-text-strong">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {hasSession ? (
            <Button asChild variant="primary">
              <Link href="/dashboard">Ir a mi panel</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Iniciar sesion</Link>
              </Button>
              <Button asChild variant="primary">
                <Link href="/register">Probar gratis</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-body hover:bg-app-surface-muted md:hidden"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-app-border bg-app-surface px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-text-body hover:bg-app-surface-muted"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            {hasSession ? (
              <Button asChild variant="primary">
                <Link href="/dashboard">Ir a mi panel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="secondary">
                  <Link href="/login">Iniciar sesion</Link>
                </Button>
                <Button asChild variant="primary">
                  <Link href="/register">Probar gratis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
