/**
 * Configuracion central de marca para el sitio publico (marketing) y metadata.
 *
 * IMPORTANTE: nombre de marca, dominio y numero de WhatsApp son decisiones de
 * negocio pendientes (ver docs/mejoras/01-landing-page-y-arquitectura-dominios.md,
 * seccion "Decisiones de negocio que bloquean el inicio"). Los valores de aqui
 * son placeholders funcionales para poder construir y probar el sitio: se
 * pueden sobreescribir por variable de entorno sin tocar codigo, y una vez
 * decididos los valores finales alcanza con actualizar los defaults de este
 * archivo o las variables de entorno en produccion.
 */

const FALLBACK_WHATSAPP_NUMBER = "59170000000";

export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "TiendaStock",
  legalName: process.env.NEXT_PUBLIC_BRAND_NAME || "TiendaStock",
  tagline: "Sistema de inventario y punto de venta para negocios en Bolivia",
  description:
    "Controla productos, stock, ventas, cierres de caja y reportes desde una plataforma simple para tiendas, almacenes y ferreterias en Bolivia.",
  domain: process.env.NEXT_PUBLIC_SITE_DOMAIN || "tiendastock.com.bo",
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || "https://tiendastock.com.bo",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hola@tiendastock.com.bo",
  whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || FALLBACK_WHATSAPP_NUMBER).replace(/\D/g, ""),
  trialDays: 30,
} as const;

export function whatsappHref(message: string) {
  return `https://wa.me/${BRAND.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
