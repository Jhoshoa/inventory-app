"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, ExternalLink, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { StoreResponse } from "@/features/settings/types";
import {
  STOREFRONT_SORTS,
  STOREFRONT_SORT_LABELS,
  STOREFRONT_TEMPLATES,
  type StorefrontTemplate,
  WEEKDAYS,
  withStorefrontDefaults,
  type StorefrontDayHours,
} from "@/features/storefront/settings";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogTitle } from "@/components/ui/Dialog";
import { formatPhone } from "@/lib/format/phone";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PhoneCountryInput } from "@/components/ui/PhoneCountryInput";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { updateStorefrontAction } from "../actions";
import { StorefrontPreview } from "./StorefrontPreview";
import { FeaturedProductsPicker, type FeaturedProductOption } from "./FeaturedProductsPicker";
import { STORE_IMAGE_KINDS, StoreImageUploader, StorePaymentQrUploader } from "./StoreImageUploader";
import type { StorefrontState } from "../types";
import { CATALOG_PARTS, partForError, type CatalogPart } from "../catalogParts";

const initialState: StorefrontState = { ok: false, message: "", fieldErrors: {} };

const DEFAULT_DAY: StorefrontDayHours = { is_open: true, opens_at: "08:00", closes_at: "20:00" };

function storefrontUrl(slug: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  return `${base}/t/${slug}`;
}

/** Sin horario guardado: lunes a sabado abierto, domingo cerrado, como sugerencia. */
function initialHours(hours: StorefrontDayHours[] | null): StorefrontDayHours[] {
  if (hours && hours.length === WEEKDAYS.length) return hours;
  return WEEKDAYS.map((_, index) =>
    index === 6 ? { is_open: false, opens_at: null, closes_at: null } : { ...DEFAULT_DAY },
  );
}

export function StorefrontSettingsForm({
  storeData,
  featuredProducts = [],
}: {
  storeData: StoreResponse;
  /** Los productos ya elegidos como destacados, con nombre y precio para mostrarlos. */
  featuredProducts?: FeaturedProductOption[];
}) {
  const settings = withStorefrontDefaults(storeData.storefront_settings);
  const [state, setState] = useState<StorefrontState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [enabled, setEnabled] = useState(storeData.storefront_enabled);
  const [slug, setSlug] = useState(storeData.storefront_slug ?? "");
  const [colorPrimary, setColorPrimary] = useState(storeData.storefront_color_primary ?? "");
  const [colorSecondary, setColorSecondary] = useState(storeData.storefront_color_secondary ?? "");
  const [announcementEnabled, setAnnouncementEnabled] = useState(settings.announcement_enabled);
  const [announcementText, setAnnouncementText] = useState(settings.announcement_text ?? "");
  const [template, setTemplate] = useState<StorefrontTemplate>(settings.template);
  const [showHours, setShowHours] = useState(settings.hours !== null);
  const [hours, setHours] = useState(() => initialHours(settings.hours));
  const router = useRouter();
  // Celular: la lista de partes y una parte a la vez; desde 1024 px el menú de partes y la vista previa.
  const wide = useMediaQuery("(min-width: 1024px)");
  const [part, setPart] = useState<CatalogPart | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const shown: CatalogPart | null = part ?? (wide ? "estado" : null);

  const savedSlug = storeData.storefront_slug;
  const isLive = storeData.storefront_enabled && Boolean(savedSlug);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setState(initialState);
    try {
      const nextState = await updateStorefrontAction(initialState, new FormData(event.currentTarget));
      setState(nextState);
      if (nextState.ok) {
        toast.success("Guardado");
        router.refresh();
      } else if (!Object.keys(nextState.fieldErrors).length) {
        toast.error(nextState.message || "No se pudo guardar el catálogo");
      } else {
        toast.error("Revisa los campos marcados");
        const first = partForError(Object.keys(nextState.fieldErrors));
        if (first) setPart(first);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el catálogo.";
      setState({ ok: false, message, fieldErrors: {} });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(storefrontUrl(slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  async function shareLink() {
    const url = storefrontUrl(slug);
    if (navigator.share) {
      try {
        await navigator.share({ title: storeData.name, url });
      } catch {
        // Cancelado: no es un error.
      }
      return;
    }
    await copyLink();
  }

  function updateDay(index: number, patch: Partial<StorefrontDayHours>) {
    setHours((current) => current.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  }

  function copyMondayToWeekdays() {
    // 0 = lunes ... 4 = viernes.
    setHours((current) => current.map((day, i) => (i > 0 && i <= 4 ? { ...current[0] } : day)));
  }

  const fieldErrors = state.ok ? {} : state.fieldErrors;
  const hoursErrors = Object.entries(fieldErrors).filter(([key]) => key.startsWith("hours"));

  const templateLabel = STOREFRONT_TEMPLATES.find((option) => option.value === template)?.label ?? template;
  const featuredCount = settings.featured_product_ids.length;
  const summaries: Record<CatalogPart, string> = {
    estado: enabled ? "Encendido" : "Apagado",
    plantilla: templateLabel,
    identidad: "Logo, portada, colores, descripción",
    secciones:
      [
        announcementEnabled ? "Anuncio" : null,
        settings.show_featured ? `destacados (${featuredCount})` : null,
        settings.show_contact ? "contacto" : null,
        settings.show_payment ? "pago" : null,
      ]
        .filter(Boolean)
        .join(", ")
        .replace(/^./, (letter) => letter.toUpperCase()) || "Solo los productos",
    productos: [STOREFRONT_SORT_LABELS[settings.default_sort], settings.hide_out_of_stock ? "ocultar agotados" : null].filter(Boolean).join(" · "),
    whatsapp: [
      formatPhone(storeData.storefront_whatsapp ?? storeData.phone) || "Sin número",
      [settings.pickup_enabled ? "recojo" : null, settings.delivery_enabled ? "envío" : null].filter(Boolean).join(" y "),
    ]
      .filter(Boolean)
      .join(" · "),
    contacto: "Dirección, mapa, redes, horario",
  };

  const preview = (
    <StorefrontPreview
      template={template}
      storeName={storeData.name}
      logoUrl={storeData.storefront_logo_url}
      colorPrimary={colorPrimary}
      colorSticker={colorSecondary}
      announcement={announcementEnabled ? announcementText.trim() || null : null}
    />
  );

  return (
    <form id="catalog-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {/* Un solo valor para el interruptor de la tarjeta (celular) y el de "Estado y link". */}
      {enabled ? <input type="hidden" name="storefront_enabled" value="on" /> : null}

      <header className={`flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between ${shown && !wide ? "max-lg:hidden" : ""}`}>
        <div className="min-w-0">
          <Link
            href="/dashboard/settings"
            className="-ml-1 mb-1 inline-flex min-h-9 items-center gap-0.5 rounded-[10px] pr-2 text-[13px] font-semibold text-text-muted hover:text-text-strong lg:hidden"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Configuración
          </Link>
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted max-lg:hidden">Configuración / Ventas en línea</p>
          <div className="flex items-center justify-between gap-2">
            <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">
              Catálogo público
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold max-lg:hidden ${isLive ? "bg-status-successBg text-status-success" : "bg-app-surface-muted text-text-muted"}`}>
                {isLive ? "Encendido" : "Apagado"}
              </span>
            </h1>
            <Button type="button" variant="secondary" className="!h-9 px-3 lg:hidden" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" aria-hidden="true" />
              Ver
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 max-lg:hidden">
          {slug ? (
            <Button type="button" variant="secondary" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? "Copiado" : "Copiar link"}
            </Button>
          ) : null}
          {isLive && savedSlug ? (
            <Button asChild variant="secondary">
              <a href={`/t/${savedSlug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Abrir catálogo
              </a>
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[180px_minmax(0,1fr)_300px]">
        <nav aria-label="Partes del catálogo" className="sticky top-4 flex flex-col gap-0.5 max-lg:hidden">
          {CATALOG_PARTS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPart(item.key)}
              aria-current={shown === item.key ? "true" : undefined}
              className={`flex min-h-9 items-center rounded-[10px] px-2 text-left text-sm ${
                shown === item.key ? "bg-app-surface-muted font-bold text-text-strong" : "font-medium text-text-body hover:bg-app-surface-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-col gap-4">
          {shown === null ? (
            <>
              <section aria-label="Estado del catálogo" className="flex flex-col gap-3 rounded-card border border-app-border bg-app-surface p-4">
                <label className="flex cursor-pointer items-start justify-between gap-3">
                  <span>
                    <span className="block text-[15px] font-bold text-text-strong">{enabled ? "Catálogo encendido" : "Catálogo apagado"}</span>
                    <span className="block text-[13px] text-text-muted">
                      {enabled ? "Cualquiera con el link lo puede ver" : "Enciéndelo para compartir tu link"}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 accent-brand-700"
                  />
                </label>
                <button type="button" onClick={() => setPart("estado")} className="flex items-center justify-between gap-2 rounded-control bg-app-surface-muted px-3 py-2 text-left font-mono text-sm text-text-body">
                  <span className="truncate">/t/{slug || "elige-tu-link"}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
                </button>
                {slug ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="secondary" onClick={copyLink}>
                      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                      {copied ? "Copiado" : "Copiar"}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => void shareLink()}>
                      <Share2 className="h-4 w-4" aria-hidden="true" />
                      Compartir
                    </Button>
                  </div>
                ) : null}
              </section>
              <ul aria-label="Partes del catálogo" className="divide-y divide-app-border overflow-hidden rounded-card border border-app-border bg-app-surface">
                {CATALOG_PARTS.filter((item) => item.key !== "estado").map((item) => (
                  <li key={item.key}>
                    <button type="button" onClick={() => setPart(item.key)} className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-app-surface-muted">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-text-strong">{item.label}</span>
                        <span className="block truncate text-[13px] text-text-muted">{summaries[item.key]}</span>
                      </span>
                      <ChevronRight className="h-[18px] w-[18px] shrink-0 text-text-disabled" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <Part id="estado" shown={shown} onBack={() => setPart(null)} saving={isSubmitting}>
            <SettingsCard title="Estado y link" description="Tu catálogo es una página pública: cualquiera con el link la puede ver.">
              <CheckboxField
                label="Catálogo encendido"
                description="Si lo apagas, el link deja de funcionar hasta que lo vuelvas a encender."
                checked={enabled}
                onChange={setEnabled}
              />
              <div className="space-y-1">
                <Label htmlFor="storefront-slug">Link del catálogo</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="shrink-0 truncate text-sm text-text-muted">{storefrontUrl("")}</span>
                  <Input
                    id="storefront-slug"
                    name="storefront_slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    placeholder="mi-tienda"
                    maxLength={60}
                  />
                </div>
                <FieldError message={fieldErrors.slug} />
                {slug ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    <button
                      type="button"
                      onClick={copyLink}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent-primary hover:text-accent-primary-hover"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copiado" : "Copiar link"}
                    </button>
                    {isLive && savedSlug ? (
                      <a
                        href={`/t/${savedSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-accent-primary hover:text-accent-primary-hover"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        Abrir catálogo
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </SettingsCard>
          </Part>
          <Part id="plantilla" shown={shown} onBack={() => setPart(null)} saving={isSubmitting}>
            <SettingsCard title="Plantilla" description="El diseño de tu catálogo. Puedes cambiarlo cuando quieras.">
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Plantilla del catálogo</legend>
                {STOREFRONT_TEMPLATES.map((option) => {
                  const selected = template === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer flex-col gap-2 rounded-lg border-2 p-3 transition-colors ${
                        selected ? "border-accent-primary bg-app-surface-muted" : "border-app-border hover:border-app-borderStrong"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-text-strong">
                        <input
                          type="radio"
                          name="settings_template"
                          value={option.value}
                          checked={selected}
                          onChange={() => setTemplate(option.value)}
                        />
                        {option.label}
                      </span>
                      <span className="text-xs text-text-muted">{option.description}</span>
                    </label>
                  );
                })}
              </fieldset>
            </SettingsCard>
          </Part>
          <Part id="identidad" shown={shown} onBack={() => setPart(null)} saving={isSubmitting}>
            <SettingsCard title="Identidad" description="Cómo se ve tu tienda arriba del catálogo.">
              <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                <StoreImageUploader
                  kind={STORE_IMAGE_KINDS.logo}
                  currentUrl={storeData.storefront_logo_url}
                  onChange={() => router.refresh()}
                />
                <StoreImageUploader
                  kind={STORE_IMAGE_KINDS.banner}
                  currentUrl={storeData.storefront_banner_url}
                  onChange={() => router.refresh()}
                />
              </div>
              <p className="text-xs text-text-muted">Sin logo mostramos las iniciales de tu tienda.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField
                  id="storefront-color-primary"
                  name="storefront_color_primary"
                  label="Color principal"
                  value={colorPrimary}
                  onChange={setColorPrimary}
                  placeholder="#2563EB"
                  error={fieldErrors.colorPrimary}
                />
                <ColorField
                  id="storefront-color-secondary"
                  name="storefront_color_secondary"
                  label="Color de acento"
                  value={colorSecondary}
                  onChange={setColorSecondary}
                  placeholder="#FFE14D"
                  error={fieldErrors.colorSecondary}
                />
              </div>
              <p className="text-xs text-text-muted">
                El principal pinta el encabezado; el de acento, los precios y botones. Si los dejas vacíos usamos
                los de la plantilla. El texto encima se pone blanco o negro solo, para que siempre se lea.
              </p>
              <div className="space-y-1">
                <Label htmlFor="storefront-description">Descripción</Label>
                <Input
                  id="storefront-description"
                  name="storefront_description"
                  defaultValue={storeData.storefront_description ?? ""}
                  placeholder="Abarrotes, lácteos y bebidas en Miraflores. Pide por WhatsApp y recoge en 15 minutos."
                  maxLength={280}
                />
                <FieldError message={fieldErrors.description} />
              </div>
            </SettingsCard>
          </Part>
          <Part id="secciones" shown={shown} onBack={() => setPart(null)} saving={isSubmitting}>
            <SettingsCard title="Secciones" description="Qué partes del catálogo ven tus clientes. Los productos siempre se muestran.">
              <div className="grid gap-3 sm:grid-cols-2">
                <CheckboxField
                  name="settings_show_featured"
                  label="Destacados"
                  description="Los productos destacados del encabezado (Vitrina)."
                  defaultChecked={settings.show_featured}
                />
                <CheckboxField
                  name="settings_show_payment"
                  label="Cómo pagar"
                  description="Tu QR e instrucciones de pago."
                  defaultChecked={settings.show_payment}
                />
                <CheckboxField
                  name="settings_show_contact"
                  label="Contacto y horario"
                  description="Dirección, mapa, horario y redes."
                  defaultChecked={settings.show_contact}
                />
                <CheckboxField
                  name="settings_announcement_enabled"
                  label="Cinta de anuncio"
                  description="Una franja arriba de todo con tu mensaje."
                  checked={announcementEnabled}
                  onChange={setAnnouncementEnabled}
                />
              </div>
              {announcementEnabled ? (
                <div className="space-y-1">
                  <Label htmlFor="settings-announcement-text">Texto de la cinta de anuncio</Label>
                  <Input
                    id="settings-announcement-text"
                    name="settings_announcement_text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Envíos gratis los sábados · Paga con QR"
                    maxLength={140}
                  />
                  <FieldError message={fieldErrors.announcementText} />
                </div>
              ) : (
                <input type="hidden" name="settings_announcement_text" value={announcementText} />
              )}
            </SettingsCard>
            <SettingsCard
              title="Productos destacados"
              description="Elige hasta 10 productos para el encabezado de la Vitrina, en el orden en que quieres mostrarlos. Si no eliges ninguno, mostramos tus productos en oferta."
            >
              <FeaturedProductsPicker
                name="settings_featured_product_ids"
                initialProducts={featuredProducts}
                error={fieldErrors.featured}
              />
            </SettingsCard>
          </Part>
          <Part id="productos" shown={shown} onBack={() => setPart(null)} saving={isSubmitting}>
            <SettingsCard title="Productos" description="Cómo se listan tus productos en el catálogo.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="settings-stock-display">Avisos de disponibilidad</Label>
                  <Select id="settings-stock-display" name="settings_stock_display" defaultValue={settings.stock_display}>
                    <option value="all">&quot;Últimas unidades&quot; y &quot;Agotado&quot;</option>
                    <option value="out_of_stock">Solo &quot;Agotado&quot;</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="settings-default-sort">Orden inicial</Label>
                  <Select id="settings-default-sort" name="settings_default_sort" defaultValue={settings.default_sort}>
                    {STOREFRONT_SORTS.map((sort) => (
                      <option key={sort} value={sort}>
                        {STOREFRONT_SORT_LABELS[sort]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <CheckboxField
                name="settings_hide_out_of_stock"
                label="Ocultar productos agotados"
                description="No aparecen en el catálogo hasta que vuelvas a tener stock."
                defaultChecked={settings.hide_out_of_stock}
              />
            </SettingsCard>
          </Part>
          <Part id="whatsapp" shown={shown} onBack={() => setPart(null)} saving={isSubmitting}>
            <SettingsCard title="Pedidos por WhatsApp" description="Adónde te escriben tus clientes y cómo reciben su compra.">
              <div className="space-y-1">
                <Label htmlFor="storefront-whatsapp">WhatsApp que recibe los pedidos</Label>
                <PhoneCountryInput
                  id="storefront-whatsapp"
                  name="storefront_whatsapp"
                  defaultValue={storeData.storefront_whatsapp ?? storeData.phone}
                  error={Boolean(fieldErrors.whatsapp)}
                  errorId="storefront-whatsapp-error"
                />
                <FieldError id="storefront-whatsapp-error" message={fieldErrors.whatsapp} />
                <p className="text-xs text-text-muted">
                  Elige el país y escribe el número como lo marcas allí. Los clientes te escriben a este número desde
                  el catálogo.
                </p>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-text-strong">Formas de entrega</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CheckboxField
                    name="settings_pickup_enabled"
                    label="Recojo en tienda"
                    defaultChecked={settings.pickup_enabled}
                  />
                  <CheckboxField
                    name="settings_delivery_enabled"
                    label="Envío a domicilio"
                    defaultChecked={settings.delivery_enabled}
                  />
                </div>
                <p className="text-xs text-text-muted">
                  Si ofreces las dos, el cliente elige una al hacer su pedido.
                </p>
              </fieldset>
            </SettingsCard>
            <SettingsCard
              title="Pago con QR (opcional)"
              description="Sube el QR que ya usas para cobrar (AloKe, ZAS, tu banco, lo que sea). Tú confirmas el pago a mano cuando te llegue: no procesamos ningún cobro."
            >
              <StorePaymentQrUploader currentUrl={storeData.storefront_payment_qr_url} onChange={() => router.refresh()} />
              <div className="space-y-1">
                <Label htmlFor="storefront-payment-instructions">Instrucciones para el cliente</Label>
                <Textarea
                  id="storefront-payment-instructions"
                  name="storefront_payment_instructions"
                  defaultValue={storeData.storefront_payment_instructions ?? ""}
                  placeholder="Paga con QR al confirmar tu pedido. Envía el comprobante por WhatsApp."
                  maxLength={280}
                  rows={2}
                />
                <FieldError message={fieldErrors.paymentInstructions} />
              </div>
            </SettingsCard>
          </Part>
          <Part id="contacto" shown={shown} onBack={() => setPart(null)} saving={isSubmitting}>
            <SettingsCard title="Contacto y horario" description="Para que tus clientes sepan dónde y cuándo encontrarte.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="settings-address">Dirección</Label>
                  <Input
                    id="settings-address"
                    name="settings_address"
                    defaultValue={settings.address ?? ""}
                    placeholder="Calle, número, zona"
                    maxLength={200}
                  />
                  <FieldError message={fieldErrors.address} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="settings-maps-url">Link de Google Maps</Label>
                  <Input
                    id="settings-maps-url"
                    name="settings_maps_url"
                    type="url"
                    inputMode="url"
                    defaultValue={settings.maps_url ?? ""}
                    placeholder="https://maps.app.goo.gl/..."
                    maxLength={300}
                  />
                  <FieldError message={fieldErrors.mapsUrl} />
                </div>
              </div>

              <div className="space-y-3">
                <CheckboxField
                  name="settings_hours_enabled"
                  label="Mostrar horario de atención"
                  checked={showHours}
                  onChange={setShowHours}
                />
                {showHours ? (
                  <div className="space-y-2">
                    <div className="divide-y divide-app-border rounded-md border border-app-border">
                      {hours.map((day, index) => (
                        <div
                          key={WEEKDAYS[index]}
                          className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2"
                        >
                          <label className="flex w-32 shrink-0 items-center gap-2 text-sm text-text-strong">
                            <input
                              type="checkbox"
                              name={`hours_${index}_open`}
                              checked={day.is_open}
                              onChange={(e) =>
                                updateDay(
                                  index,
                                  e.target.checked
                                    ? { is_open: true, opens_at: day.opens_at ?? "08:00", closes_at: day.closes_at ?? "20:00" }
                                    : { is_open: false },
                                )
                              }
                              className="h-4 w-4 rounded border-app-borderStrong"
                            />
                            {WEEKDAYS[index]}
                          </label>
                          {day.is_open ? (
                            <div className="flex items-center gap-2">
                              <div className="w-36">
                                <Input
                                  type="time"
                                  name={`hours_${index}_opens_at`}
                                  aria-label={`${WEEKDAYS[index]}: abre`}
                                  value={day.opens_at ?? ""}
                                  onChange={(e) => updateDay(index, { opens_at: e.target.value })}
                                />
                              </div>
                              <span className="text-sm text-text-muted">a</span>
                              <div className="w-36">
                                <Input
                                  type="time"
                                  name={`hours_${index}_closes_at`}
                                  aria-label={`${WEEKDAYS[index]}: cierra`}
                                  value={day.closes_at ?? ""}
                                  onChange={(e) => updateDay(index, { closes_at: e.target.value })}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-text-muted">Cerrado</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={copyMondayToWeekdays}
                      className="text-xs font-medium text-accent-primary hover:text-accent-primary-hover"
                    >
                      Usar el horario del lunes de lunes a viernes
                    </button>
                    {hoursErrors.map(([key, message]) => (
                      <FieldError key={key} message={message} />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="settings-facebook">Facebook</Label>
                  <Input
                    id="settings-facebook"
                    name="settings_facebook"
                    defaultValue={settings.facebook ? `facebook.com/${settings.facebook}` : ""}
                    placeholder="facebook.com/mitienda"
                    maxLength={120}
                  />
                  <FieldError message={fieldErrors.facebook} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="settings-instagram">Instagram</Label>
                  <Input
                    id="settings-instagram"
                    name="settings_instagram"
                    defaultValue={settings.instagram ? `@${settings.instagram}` : ""}
                    placeholder="@mitienda"
                    maxLength={120}
                  />
                  <FieldError message={fieldErrors.instagram} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="settings-tiktok">TikTok</Label>
                  <Input
                    id="settings-tiktok"
                    name="settings_tiktok"
                    defaultValue={settings.tiktok ? `@${settings.tiktok}` : ""}
                    placeholder="@mitienda"
                    maxLength={120}
                  />
                  <FieldError message={fieldErrors.tiktok} />
                </div>
              </div>
              <FieldError message={fieldErrors.settings} />
            </SettingsCard>
          </Part>
          <p className="text-xs text-text-muted max-lg:hidden">Los cambios se ven en la vista previa al momento y se publican al guardar.</p>
        </div>

        <aside aria-label="Vista previa" className="sticky top-4 flex flex-col gap-3 max-lg:hidden">
          <div className="rounded-card border border-app-border bg-app-surface p-4">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-muted">Vista previa</p>
            {preview}
          </div>
          <PrivacyNote />
        </aside>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen} position="sheet" size="sm">
        <DialogTitle close>Vista previa</DialogTitle>
        <DialogBody className="pb-5">
          {preview}
          <p className="mt-3 text-center text-xs text-text-muted">Cambia con lo que vas editando. Guarda para publicarlo.</p>
        </DialogBody>
      </Dialog>
    </form>
  );
}

/** Una parte del catálogo (el título lo pone su tarjeta): en el celular con "‹ Catálogo público" y Guardar abajo. */
function Part({
  id,
  shown,
  onBack,
  saving,
  children,
}: {
  id: CatalogPart;
  shown: CatalogPart | null;
  onBack: () => void;
  saving: boolean;
  children: ReactNode;
}) {
  // Oculta pero en el formulario: al guardar se mandan todas las partes.
  return (
    <div hidden={shown !== id} className={shown === id ? "flex flex-col gap-4" : "hidden"}>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 mb-1 inline-flex min-h-9 items-center gap-0.5 rounded-[10px] pr-2 text-[13px] font-semibold text-text-muted hover:text-text-strong"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Catálogo público
        </button>
      </div>
      {children}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+104px)] z-20 lg:hidden">
        <Button type="submit" disabled={saving} className="!h-12 w-full text-base shadow-floating">
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

function PrivacyNote() {
  return (
    <div className="space-y-3 rounded-card border border-app-border bg-app-surface p-4 text-sm">
      <div>
        <p className="flex items-center gap-2 font-medium text-text-strong">
          <ShieldCheck className="h-4 w-4 text-status-success" aria-hidden="true" />
          Lo que ve tu cliente
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-text-muted">
          <li>Nombre, foto, categoría y precio de venta</li>
          <li>Avisos de &quot;Últimas unidades&quot; o &quot;Agotado&quot;</li>
          <li>Lo que configures en esta página</li>
        </ul>
      </div>
      <div>
        <p className="flex items-center gap-2 font-medium text-text-strong">
          <EyeOff className="h-4 w-4 text-text-muted" aria-hidden="true" />
          Lo que nunca se muestra
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-text-muted">
          <li>Cantidad exacta de stock</li>
          <li>Costo de compra y márgenes</li>
          <li>Tus ventas y tu caja</li>
        </ul>
      </div>
    </div>
  );
}

function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-app-border bg-app-surface p-4 shadow-panel sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-text-strong">{title}</h2>
        {description ? <p className="mt-1 text-sm text-text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function CheckboxField({
  name,
  label,
  description,
  defaultChecked,
  checked,
  onChange,
}: {
  /** Sin nombre cuando el valor va en un campo oculto aparte (Catálogo encendido). */
  name?: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked === undefined ? defaultChecked : undefined}
        checked={checked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-app-borderStrong"
      />
      <span>
        <span className="block text-sm font-medium text-text-strong">{label}</span>
        {description ? <span className="block text-xs text-text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

function ColorField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
}) {
  const isValid = /^#[0-9A-Fa-f]{6}$/.test(value);
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`Elegir ${label.toLowerCase()}`}
          value={isValid ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-app-borderStrong bg-app-surface p-1"
        />
        <Input
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder={placeholder}
          maxLength={7}
        />
      </div>
      <FieldError message={error} />
    </div>
  );
}
