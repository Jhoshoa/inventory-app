import { MessageCircle } from "lucide-react";
import { storefrontWhatsappHref } from "../whatsapp";

export function StorefrontFloatingContact({ whatsapp, storeName }: { whatsapp: string; storeName: string }) {
  return (
    <a
      href={storefrontWhatsappHref(whatsapp, `Hola, quiero consultar por sus productos en ${storeName}`)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-status-success text-text-inverse shadow-floating transition-transform hover:scale-105"
      aria-label="Contactar por WhatsApp"
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-success opacity-75" />
      <MessageCircle className="relative h-6 w-6" aria-hidden="true" />
    </a>
  );
}
