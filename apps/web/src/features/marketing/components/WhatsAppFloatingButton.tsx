import { MessageCircle } from "lucide-react";
import { BRAND, whatsappHref } from "@/lib/brand";

export function WhatsAppFloatingButton() {
  return (
    <a
      href={whatsappHref(`Hola, quiero conocer mas sobre ${BRAND.name}`)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-status-success text-text-inverse shadow-floating transition-transform hover:scale-105"
      aria-label="Escribinos por WhatsApp"
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}
