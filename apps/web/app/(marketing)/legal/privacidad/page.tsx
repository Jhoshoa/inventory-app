import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Politica de privacidad",
  description: `Como ${BRAND.name} recopila, usa y protege tu informacion.`,
  alternates: { canonical: "/legal/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-text-strong">Politica de privacidad</h1>
      <p className="mt-2 text-sm text-text-muted">Ultima actualizacion: {new Date().toLocaleDateString("es-BO")}</p>

      <div className="prose-none mt-8 space-y-6 text-text-body">
        <section>
          <h2 className="text-xl font-semibold text-text-strong">1. Que informacion recopilamos</h2>
          <p className="mt-2">
            Recopilamos la informacion que nos das al crear una cuenta (nombre, correo, telefono, datos de tu
            negocio) y la que registras al usar la plataforma (productos, ventas, inventario). Tambien recopilamos
            informacion de contacto cuando completas el formulario de esta pagina o nos escribes por WhatsApp.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">2. Para que usamos tu informacion</h2>
          <p className="mt-2">
            Usamos tu informacion para operar el servicio, responder tus consultas, enviarte comunicaciones
            relacionadas con tu cuenta o suscripcion, y mejorar la plataforma. No vendemos tu informacion a terceros.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">3. Aislamiento entre tiendas</h2>
          <p className="mt-2">
            Cada tienda que usa {BRAND.name} tiene su informacion completamente separada de las demas. El acceso a
            los datos de una tienda requiere iniciar sesion con una cuenta autorizada de esa tienda.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">4. Con quien compartimos informacion</h2>
          <p className="mt-2">
            Podemos compartir informacion con proveedores que nos ayudan a operar el servicio (por ejemplo,
            almacenamiento de base de datos, envio de correos o procesamiento de pagos), unicamente en la medida
            necesaria para prestar el servicio, y bajo obligaciones de confidencialidad.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">5. Formulario de contacto</h2>
          <p className="mt-2">
            Si completas el formulario de contacto, usamos tus datos (nombre, telefono, correo si lo indicas)
            unicamente para responder tu consulta y, si nos autorizas, hacer seguimiento comercial por WhatsApp
            o correo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">6. Tus derechos</h2>
          <p className="mt-2">
            Puedes solicitar acceso, correccion o eliminacion de tus datos personales escribiendonos a{" "}
            {BRAND.supportEmail}.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">7. Cambios a esta politica</h2>
          <p className="mt-2">
            Podemos actualizar esta politica ocasionalmente. Publicaremos cualquier cambio en esta misma pagina.
          </p>
        </section>
      </div>
    </div>
  );
}
