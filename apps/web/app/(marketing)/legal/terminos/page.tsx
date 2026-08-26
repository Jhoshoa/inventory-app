import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Terminos de servicio",
  description: `Terminos y condiciones de uso de ${BRAND.name}.`,
  alternates: { canonical: "/legal/terminos" },
};

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-text-strong">Terminos de servicio</h1>
      <p className="mt-2 text-sm text-text-muted">Ultima actualizacion: {new Date().toLocaleDateString("es-BO")}</p>

      <div className="prose-none mt-8 space-y-6 text-text-body">
        <section>
          <h2 className="text-xl font-semibold text-text-strong">1. Aceptacion de los terminos</h2>
          <p className="mt-2">
            Al crear una cuenta y usar {BRAND.name}, aceptas estos terminos de servicio. Si no estas de acuerdo,
            no debes usar la plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">2. Descripcion del servicio</h2>
          <p className="mt-2">
            {BRAND.name} es una plataforma de gestion de inventario, punto de venta y reportes para negocios,
            ofrecida bajo un modelo de suscripcion con un periodo de prueba gratuito.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">3. Cuenta y responsabilidad del usuario</h2>
          <p className="mt-2">
            Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de toda la actividad
            que ocurra en tu cuenta. Debes proporcionar informacion veraz al registrarte.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">4. Periodo de prueba y suscripcion</h2>
          <p className="mt-2">
            Ofrecemos un periodo de prueba gratuito. Al finalizar, para continuar usando la plataforma se requiere
            una suscripcion activa segun el plan contratado. Los detalles de precio se acuerdan directamente contigo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">5. Datos de tu negocio</h2>
          <p className="mt-2">
            Los datos que registras (productos, ventas, inventario) son tuyos. No los compartimos con otras tiendas
            ni los usamos con fines distintos a operar el servicio, salvo que la ley lo requiera.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">6. Disponibilidad del servicio</h2>
          <p className="mt-2">
            Trabajamos para mantener el servicio disponible de forma continua, pero no garantizamos disponibilidad
            del 100%. Podemos realizar mantenimientos programados con aviso previo cuando sea posible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">7. Cancelacion</h2>
          <p className="mt-2">
            Puedes cancelar tu suscripcion en cualquier momento. Al cancelar, mantendremos tus datos disponibles
            por un periodo razonable antes de proceder a su archivado o eliminacion.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">8. Contacto</h2>
          <p className="mt-2">
            Para consultas sobre estos terminos, escribenos a {BRAND.supportEmail}.
          </p>
        </section>
      </div>
    </div>
  );
}
