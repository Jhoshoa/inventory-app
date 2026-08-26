import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FaqAccordion } from "@/features/marketing/components/FaqAccordion";
import { SectionHeading } from "@/features/marketing/components/SectionHeading";
import { FAQS, FEATURES, SEGMENTS, TRIAL_DAYS } from "@/features/marketing/data";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Sistema de inventario y ventas para negocios en Bolivia`,
  description: BRAND.description,
  alternates: { canonical: "/" },
};

export default function MarketingHomePage() {
  return (
    <>
      <section className="border-b border-app-border bg-gradient-to-b from-brand-50 to-app-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center rounded-full border border-brand-100 bg-app-surface px-3 py-1 text-sm font-medium text-brand-700 shadow-sm">
              Hecho para negocios en Bolivia
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-text-strong sm:text-5xl">
              Sistema de inventario y ventas para tiendas, ferreterias y almacenes
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-text-body">{BRAND.description}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="primary" className="h-12 px-6 text-base">
                <Link href="/register">
                  Probar {TRIAL_DAYS} dias gratis
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="h-12 px-6 text-base">
                <Link href="/precios">Ver precios</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-text-muted">Sin tarjeta de credito. Cancela cuando quieras.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="El problema"
          title="Llevar el inventario a mano se vuelve un caos"
          description="Cuadernos, hojas de calculo sueltas y ventas sin registro hacen que pierdas tiempo y dinero sin darte cuenta."
        />
      </section>

      <section className="border-y border-app-border bg-app-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Funcionalidades" title="Todo lo que tu negocio necesita en un solo lugar" />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-lg border border-app-border bg-app-surface p-5 shadow-panel">
                <feature.icon className="h-8 w-8 text-brand-700" aria-hidden="true" />
                <h3 className="mt-4 font-semibold text-text-strong">{feature.title}</h3>
                <p className="mt-2 text-sm text-text-body">{feature.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild variant="secondary">
              <Link href="/funcionalidades">
                Ver todas las funcionalidades
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Para quien es" title="Pensado para negocios como el tuyo" />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {SEGMENTS.map((segment) => (
            <div key={segment.title} className="rounded-lg border border-app-border bg-app-surface p-6 text-center shadow-panel">
              <h3 className="font-semibold text-text-strong">{segment.title}</h3>
              <p className="mt-2 text-sm text-text-body">{segment.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-app-border bg-app-surface-muted">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Beneficios" title="Menos errores, mejor control, decisiones mas claras" />
          <ul className="mx-auto mt-10 grid max-w-xl gap-4">
            {[
              "Menos errores humanos al registrar ventas y stock",
              "Reportes claros para tomar decisiones sin adivinar",
              `${TRIAL_DAYS} dias de prueba gratis para validar que funciona para ti`,
              "Datos de tu tienda completamente separados de otras tiendas",
            ].map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-text-body">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-status-success" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Preguntas frecuentes" title="Resolvemos tus dudas" />
        <div className="mt-10">
          <FaqAccordion items={FAQS} />
        </div>
      </section>

      <section className="border-t border-app-border bg-brand-700">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-text-inverse">Empieza a controlar tu inventario hoy</h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-50">
            Crea tu cuenta gratis y prueba {BRAND.name} por {TRIAL_DAYS} dias sin compromiso.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="secondary" className="h-12 px-6 text-base">
              <Link href="/register">Probar gratis</Link>
            </Button>
            <Button asChild variant="ghost" className="h-12 px-6 text-base text-text-inverse hover:bg-brand-800">
              <Link href="/contacto">Hablar con ventas</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
