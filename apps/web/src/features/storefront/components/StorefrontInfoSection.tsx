import { Clock, MapPin, QrCode, Store, Truck } from "lucide-react";
import type { ReactNode } from "react";
import type { PublicStorefront } from "../types";
import { facebookUrl, groupHours, instagramUrl, tiktokUrl } from "../settings";
import { StorefrontOpenStatus } from "./StorefrontOpenStatus";

/** Como comprar, donde estamos y cuando abrimos: lo que la tienda eligio mostrar. */
export function StorefrontInfoSection({ store }: { store: PublicStorefront }) {
  const { settings } = store;
  const showPayment = settings.show_payment && Boolean(store.payment_qr_url || store.payment_instructions);
  const deliveryModes = [
    settings.pickup_enabled ? { icon: Store, label: "Recojo en tienda" } : null,
    settings.delivery_enabled ? { icon: Truck, label: "Envio a domicilio" } : null,
  ].filter((mode) => mode !== null);
  const socials = [
    settings.facebook ? { label: "Facebook", href: facebookUrl(settings.facebook) } : null,
    settings.instagram ? { label: "Instagram", href: instagramUrl(settings.instagram) } : null,
    settings.tiktok ? { label: "TikTok", href: tiktokUrl(settings.tiktok) } : null,
  ].filter((social) => social !== null);
  const hasContact =
    settings.show_contact && Boolean(settings.address || settings.maps_url || settings.hours || socials.length);

  if (!showPayment && !hasContact && deliveryModes.length === 0) return null;

  return (
    <section aria-label="Informacion de la tienda" className="grid gap-4 border-t border-app-border pt-6 md:grid-cols-2">
      {showPayment || deliveryModes.length > 0 ? (
        <InfoCard title="Como comprar">
          {deliveryModes.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {deliveryModes.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-app-border px-3 py-1 text-sm text-text-body"
                >
                  <Icon className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          ) : null}
          {showPayment ? (
            <div className="flex items-start gap-4">
              {store.payment_qr_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- imagen remota (Cloudinary), sin loader configurado
                <img
                  src={store.payment_qr_url}
                  alt="QR de pago de la tienda"
                  className="h-32 w-32 shrink-0 rounded-md border border-app-border bg-app-surface object-contain"
                />
              ) : (
                <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
              )}
              <p className="text-sm text-text-body">
                {store.payment_instructions ?? "Puedes pagar con este QR. Envia el comprobante por WhatsApp."}
              </p>
            </div>
          ) : null}
        </InfoCard>
      ) : null}

      {hasContact ? (
        <InfoCard title="Contacto y horario">
          {settings.address || settings.maps_url ? (
            <div className="flex items-start gap-2 text-sm text-text-body">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
              <div className="min-w-0">
                {settings.address ? <p className="break-words">{settings.address}</p> : null}
                {settings.maps_url ? (
                  <a
                    href={settings.maps_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="font-medium text-accent-primary hover:text-accent-primary-hover"
                  >
                    Ver en Google Maps
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
          {settings.hours ? (
            <div className="flex items-start gap-2 text-sm">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
              <div className="min-w-0 flex-1 space-y-2">
                <StorefrontOpenStatus hours={settings.hours} timezone={store.timezone} />
                <dl className="space-y-1">
                  {groupHours(settings.hours).map((group) => (
                    <div key={group.days} className="flex justify-between gap-3">
                      <dt className="text-text-body">{group.days}</dt>
                      <dd className={group.open ? "tabular-nums text-text-strong" : "text-text-muted"}>{group.label}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          ) : null}
          {socials.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="rounded-full border border-app-border px-3 py-1 text-sm text-text-body hover:bg-app-surface-muted"
                >
                  {social.label}
                </a>
              ))}
            </div>
          ) : null}
        </InfoCard>
      ) : null}
    </section>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-app-border bg-app-surface p-4">
      <h2 className="text-base font-semibold text-text-strong">{title}</h2>
      {children}
    </div>
  );
}
