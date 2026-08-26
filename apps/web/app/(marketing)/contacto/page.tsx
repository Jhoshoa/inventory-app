import type { Metadata } from "next";
import { MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "@/features/marketing/components/ContactForm";
import { SectionHeading } from "@/features/marketing/components/SectionHeading";
import { BRAND, whatsappHref } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escribenos por WhatsApp o completa el formulario para solicitar una demo de nuestro sistema de inventario.",
  alternates: { canonical: "/contacto" },
};

export default function ContactoPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Contacto"
        title="Hablemos sobre tu negocio"
        description="Cuentanos que necesitas y te contactamos en menos de un dia habil."
      />

      <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <div className="rounded-lg border border-app-border bg-app-surface p-6 shadow-panel sm:p-8">
          <ContactForm />
        </div>

        <div className="space-y-6">
          <a
            href={whatsappHref(`Hola, quiero conocer mas sobre ${BRAND.name}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 rounded-lg border border-app-border bg-app-surface p-5 shadow-panel transition-colors hover:bg-app-surface-muted"
          >
            <MessageCircle className="h-6 w-6 shrink-0 text-status-success" aria-hidden="true" />
            <div>
              <p className="font-semibold text-text-strong">WhatsApp</p>
              <p className="text-sm text-text-body">La forma mas rapida de escribirnos. Respondemos en horario habil.</p>
            </div>
          </a>

          <div className="flex items-start gap-4 rounded-lg border border-app-border bg-app-surface p-5 shadow-panel">
            <Phone className="h-6 w-6 shrink-0 text-brand-700" aria-hidden="true" />
            <div>
              <p className="font-semibold text-text-strong">Correo</p>
              <p className="text-sm text-text-body">{BRAND.supportEmail}</p>
            </div>
          </div>

          <div className="rounded-lg border border-app-border bg-app-surface-muted p-5 text-sm text-text-muted">
            Horario de atencion: lunes a viernes, 9:00 a 18:00 (hora Bolivia).
          </div>
        </div>
      </div>
    </div>
  );
}
