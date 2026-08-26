import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/features/marketing/components/SectionHeading";
import { TRIAL_DAYS } from "@/features/marketing/data";
import { BRAND, whatsappHref } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Precios",
  description: "Conoce que incluye el plan y solicita una cotizacion personalizada segun el tamano de tu negocio.",
  alternates: { canonical: "/precios" },
};

const INCLUDED = [
  "Control de inventario y stock ilimitado de productos",
  "Punto de venta (POS) conectado al inventario",
  "Reportes de ventas y movimientos de stock",
  "Cierre de caja diario",
  "Etiquetas y codigos QR para productos",
  "Importacion de productos por CSV",
  "Roles de dueno y cajero",
  `${TRIAL_DAYS} dias de prueba gratis, sin tarjeta de credito`,
];

export default function PreciosPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Precios"
        title="Un plan simple, adaptado a tu negocio"
        description="El costo final depende del tamano de tu negocio y cuantas personas lo van a usar. Escribenos y te damos una cotizacion clara en minutos."
      />

      <div className="mx-auto mt-12 max-w-md rounded-xl border border-app-borderStrong bg-app-surface p-8 shadow-floating">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Plan Negocio</p>
        <p className="mt-2 text-3xl font-bold text-text-strong">Desde una cotizacion personalizada</p>
        <p className="mt-1 text-sm text-text-muted">Precio segun numero de usuarios y sucursales.</p>

        <ul className="mt-6 space-y-3">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-text-body">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-status-success" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3">
          <Button asChild variant="primary" className="h-11">
            <Link href="/register">Probar {TRIAL_DAYS} dias gratis</Link>
          </Button>
          <Button asChild variant="secondary" className="h-11">
            <a href={whatsappHref(`Hola, quiero una cotizacion de ${BRAND.name} para mi negocio`)} target="_blank" rel="noopener noreferrer">
              Solicitar cotizacion por WhatsApp
            </a>
          </Button>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-lg text-center text-sm text-text-muted">
        No pedimos tarjeta de credito para la prueba gratuita. Puedes cancelar en cualquier momento durante el periodo de prueba.
      </p>
    </div>
  );
}
