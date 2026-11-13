import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { BrandMark } from "@/features/marketing/components/BrandLogo";
import { BRAND } from "@/lib/brand";

interface AuthShellProps {
  title: string;
  description?: string;
  children: ReactNode;
  /** "¿No tienes cuenta?" + enlace. */
  footerText?: string;
  footerHref?: string;
  footerLinkLabel?: string;
  /** "‹ Volver a entrar" arriba (recuperar contraseña). */
  back?: { href: string; label: string };
}

/**
 * Entrar, crear tienda, contraseña e invitación (tablero P13). Celular: la marca arriba
 * y el formulario. Escritorio: la marca con qué hace la app a la izquierda y el
 * formulario a la derecha.
 */
export function AuthShell({ title, description, children, footerText, footerHref, footerLinkLabel, back }: AuthShellProps) {
  return (
    <main className="grid min-h-screen bg-app-background text-text-body lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-700 p-12 text-text-inverse lg:flex">
        <BrandLink inverse />
        <div className="max-w-md">
          <p className="text-[34px] font-extrabold leading-tight tracking-tight">Vende, controla tu stock y cierra caja desde el celular.</p>
          <p className="mt-4 text-lg text-white/80">Funciona sin internet y se sincroniza solo.</p>
        </div>
        <p className="text-sm text-white/80">{BRAND.tagline}</p>
      </aside>

      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[400px]">
          <div className="mb-6 lg:hidden">
            <BrandLink />
          </div>
          {back ? (
            <Link
              href={back.href}
              className="tap-area -ml-1 mb-2 inline-flex min-h-9 items-center gap-0.5 rounded-[10px] pr-2 text-sm font-semibold text-text-muted hover:text-text-strong"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {back.label}
            </Link>
          ) : null}
          <h1 className="text-[26px] font-extrabold tracking-tight text-text-strong">{title}</h1>
          {description ? <p className="mt-1 text-[15px] text-text-muted">{description}</p> : null}
          <div className="mt-6">{children}</div>
          {footerText && footerHref && footerLinkLabel ? (
            <p className="mt-6 text-center text-sm text-text-muted">
              {footerText}{" "}
              <Link
                className="font-bold text-brand-700 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
                href={footerHref}
              >
                {footerLinkLabel}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function BrandLink({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 text-[17px] font-extrabold ${inverse ? "text-text-inverse" : "text-text-strong"}`}>
      <BrandMark size={32} />
      {BRAND.name}
    </Link>
  );
}
