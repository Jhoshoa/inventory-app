import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/features/marketing/components/SectionHeading";
import { FEATURES } from "@/features/marketing/data";

export const metadata: Metadata = {
  title: "Funcionalidades",
  description:
    "Control de inventario, punto de venta, reportes de ventas, cierre de caja, etiquetas QR e importacion de productos por CSV.",
  alternates: { canonical: "/funcionalidades" },
};

export default function FuncionalidadesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Funcionalidades"
        title="Un modulo para cada parte de tu operacion"
        description="Todo conectado: cuando vendes, tu stock se actualiza solo. Cuando cierras caja, tus reportes ya estan listos."
      />

      <div className="mt-14 space-y-10">
        {FEATURES.map((feature, index) => (
          <div
            key={feature.title}
            className={`flex flex-col gap-6 rounded-lg border border-app-border bg-app-surface p-6 shadow-panel sm:flex-row sm:items-start ${
              index % 2 === 1 ? "sm:flex-row-reverse" : ""
            }`}
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-50">
              <feature.icon className="h-7 w-7 text-brand-700" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-strong">{feature.title}</h2>
              <p className="mt-2 text-text-body">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 flex flex-col items-center gap-3 rounded-lg border border-app-border bg-app-surface-muted p-10 text-center">
        <h2 className="text-2xl font-semibold text-text-strong">Listo para verlo funcionando?</h2>
        <p className="max-w-md text-text-body">Crea tu cuenta gratis o escribenos para una demo personalizada.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="primary">
            <Link href="/register">
              Probar gratis
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/contacto">Solicitar demo</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
