import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Cómo ${BRAND.name} recopila, usa y protege tu información.`,
  alternates: { canonical: "/legal/privacidad" },
};

export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-text-strong">Política de privacidad</h1>
      <p className="mt-2 text-sm text-mkt-muted">Última actualización: {new Date().toLocaleDateString("es-BO")}</p>

      <div className="prose-none mt-8 space-y-6 text-text-body">
        <section>
          <h2 className="text-xl font-semibold text-text-strong">1. Qué información recopilamos</h2>
          <p className="mt-2">
            Recopilamos la información que nos das al crear una cuenta (nombre, correo, teléfono, datos de tu
            negocio) y la que registras al usar la plataforma (productos, ventas, inventario). También recopilamos
            información de contacto cuando completas el formulario de esta página o nos escribes por WhatsApp.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">2. Para qué usamos tu información</h2>
          <p className="mt-2">
            Usamos tu información para operar el servicio, responder tus consultas, enviarte comunicaciones
            relacionadas con tu cuenta o suscripción, y mejorar la plataforma. No vendemos tu información a terceros.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">3. Aislamiento entre tiendas</h2>
          <p className="mt-2">
            Cada tienda que usa {BRAND.name} tiene su información completamente separada de las demás. El acceso a
            los datos de una tienda requiere iniciar sesión con una cuenta autorizada de esa tienda.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">4. Con quién compartimos información</h2>
          <p className="mt-2">
            Podemos compartir información con proveedores que nos ayudan a operar el servicio (por ejemplo,
            almacenamiento de base de datos, envío de correos o procesamiento de pagos), únicamente en la medida
            necesaria para prestar el servicio, y bajo obligaciones de confidencialidad.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">5. Formulario de contacto</h2>
          <p className="mt-2">
            Si completas el formulario de contacto, usamos tus datos (nombre, teléfono, correo si lo indicas)
            únicamente para responder tu consulta y, si nos autorizas, hacer seguimiento comercial por WhatsApp
            o correo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">6. Tus derechos</h2>
          <p className="mt-2">
            Puedes solicitar acceso, corrección o eliminación de tus datos personales escribiéndonos a{" "}
            {BRAND.supportEmail}.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text-strong">7. Cambios a esta política</h2>
          <p className="mt-2">
            Podemos actualizar esta política ocasionalmente. Publicaremos cualquier cambio en esta misma página.
          </p>
        </section>
      </div>
    </div>
  );
}
