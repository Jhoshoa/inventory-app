"use client";

import { useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/Dialog";
import { formatCurrency } from "@/lib/format/currency";
import { useBoleta } from "../boleta";
import { BoletaReceipt, BoletaSent, type BoletaStore, type SentOrder } from "./BoletaPanel";

/** Boleta al costado de los productos (Vitrina en pantallas grandes). */
export function BoletaAside({ store }: { store: BoletaStore }) {
  const [sent, setSent] = useState<SentOrder | null>(null);

  return (
    <aside aria-label="Tu boleta de pedido" className="sticky top-4 hidden w-full max-w-[420px] flex-[1_1_320px] lg:block">
      {sent ? (
        <div className="border-2 border-sf-ink bg-sf-paper p-6">
          <BoletaSent store={store} sent={sent} onBack={() => setSent(null)} />
        </div>
      ) : (
        <BoletaReceipt store={store} onSent={setSent} />
      )}
    </aside>
  );
}

/**
 * Barra fija abajo con el total y la hoja de la boleta. En Vitrina solo en el
 * celular (en escritorio esta la boleta al costado); en Lista siempre.
 */
export function BoletaBar({
  store,
  variant,
  themeVars,
  fontClassName,
}: {
  store: BoletaStore;
  variant: "vitrina" | "lista";
  /** El dialogo se monta en <body>, fuera del contenedor con los colores y fuentes de la tienda. */
  themeVars: Record<string, string>;
  fontClassName: string;
}) {
  const { lines, itemCount, total } = useBoleta();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<SentOrder | null>(null);
  const hideOnDesktop = variant === "vitrina" ? "lg:hidden" : "";

  function close() {
    setOpen(false);
    setSent(null);
  }

  return (
    <>
      {lines.length > 0 ? (
        <>
          {/* Lugar al final de la pagina para que la barra no tape el pie. */}
          <div aria-hidden="true" className={`h-28 ${hideOnDesktop}`} />
          <div className={`fixed inset-x-3 bottom-4 z-30 mx-auto max-w-3xl ${hideOnDesktop}`}>
            <div
              className={`flex items-center justify-between gap-3 px-4 py-3.5 text-white shadow-[0_10px_24px_rgba(0,0,0,0.25)] ${
                variant === "lista" ? "border-2 border-sf-ink bg-sf-ink" : "rounded-2xl bg-[#111111]"
              }`}
            >
              <div className="min-w-0 font-receipt text-[13px] leading-snug">
                <p>
                  {variant === "lista" ? "TU PEDIDO" : "TU BOLETA"} · {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>
                <p className="text-base font-bold text-sf-stickerOnDark">{formatCurrency(total)}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className={
                  variant === "lista"
                    ? "shrink-0 border-2 border-white bg-[#0E7A3E] px-4 py-3 text-[15px] font-bold text-white hover:opacity-90"
                    : "shrink-0 rounded-full bg-sf-sticker px-4 py-2.5 text-sm font-bold text-sf-onSticker hover:opacity-90"
                }
              >
                {variant === "lista" ? "Ver pedido →" : "Ver boleta →"}
              </button>
            </div>
          </div>
        </>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
        size="lg"
        className="h-full w-full max-w-lg overflow-hidden rounded-3xl border-0 bg-transparent"
      >
        <div data-storefront style={themeVars} className={`${fontClassName} h-full overflow-y-auto rounded-3xl border-2 border-[#111111] bg-sf-primary font-archivo`}>
        <div className="flex items-center gap-3 px-4 pb-3 pt-5 text-sf-onPrimary">
          <button
            type="button"
            onClick={close}
            aria-label="Volver al catalogo"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-[#111111]"
          >
            ←
          </button>
          <DialogTitle className="p-0">
            <span className="font-display text-[22px] font-normal uppercase text-sf-onPrimary">
              {sent ? "Pedido enviado" : "Tu boleta"}
            </span>
          </DialogTitle>
        </div>
        <div className="px-3.5 pb-6">
          {sent ? (
            <div className="rounded-2xl bg-sf-paper p-5">
              <BoletaSent store={store} sent={sent} onBack={close} />
            </div>
          ) : (
            <BoletaReceipt store={store} onSent={setSent} showTitle={false} showWhatsappPreview />
          )}
        </div>
        </div>
      </Dialog>
    </>
  );
}
