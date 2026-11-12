"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, MessageCircle, Printer, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { canVoidSale } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { saleReceiptText, shortSaleId, whatsappHref } from "../list";
import type { Sale } from "../types";
import { SaleReceiptDialog } from "./SaleReceiptDialog";
import type { ReceiptStoreInfo } from "./SaleReceipt";
import { SaleStatusBadge } from "./SaleStatusBadge";
import { SaleFacts, SaleLines, SaleTotals, SaleVoidedNote, saleSubtitle } from "./SaleSummary";
import { VoidSaleDialog } from "./VoidSaleDialog";

/**
 * Página de la venta (tablero P06 · Detalle): en el celular la abre la lista y lleva
 * abajo Recibo, WhatsApp, Imprimir y Anular (solo el dueño, solo completadas).
 */
export function SaleDetail({
  sale: initialSale,
  role,
  store,
  today,
}: {
  sale: Sale;
  role: UserRole;
  store: ReceiptStoreInfo;
  today: string;
}) {
  const [sale, setSale] = useState(initialSale);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const canVoid = sale.status === "completed" && canVoidSale(role);

  async function reload() {
    try {
      const response = await fetch(`/api/sales/${sale.id}`, { cache: "no-store" });
      if (response.ok) setSale((await response.json()) as Sale);
    } catch {
      // Sin conexión: se queda la que había; el aviso del 409 ya se mostró.
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-40 sm:pb-4">
      <header className="flex items-start gap-1.5">
        <Link
          href="/dashboard/sales"
          aria-label="Volver a ventas"
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-text-body hover:bg-app-surface-muted"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-lg font-extrabold tracking-tight text-text-strong sm:text-[22px]">Venta {shortSaleId(sale.id)}</h1>
          <p className="text-xs text-text-muted sm:text-sm">{saleSubtitle(sale, today)}</p>
        </div>
        <SaleStatusBadge status={sale.status} className="mt-1.5 shrink-0" />
      </header>

      <SaleVoidedNote sale={sale} today={today} />

      <section aria-label="Productos" className="flex flex-col gap-2 rounded-card border border-app-border bg-app-surface p-4">
        <SaleLines sale={sale} />
        <SaleTotals sale={sale} />
      </section>

      <section aria-label="Datos de la venta" className="rounded-card border border-app-border bg-app-surface p-4">
        <SaleFacts sale={sale} />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-app-border bg-app-surface px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 sm:static sm:flex-row sm:flex-wrap sm:border-0 sm:bg-transparent sm:p-0">
        <div className="grid grid-cols-3 gap-2 sm:flex [&>*]:max-sm:!gap-1.5 [&>*]:max-sm:!px-2">
          <Button variant="secondary" onClick={() => setReceiptOpen(true)}>
            <ReceiptText className="h-4 w-4 shrink-0 max-[359px]:hidden" aria-hidden="true" />
            Recibo
          </Button>
          <Button variant="secondary" asChild>
            <a href={whatsappHref(saleReceiptText(sale, store.name, today))} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 shrink-0 max-[359px]:hidden" aria-hidden="true" />
              WhatsApp
            </a>
          </Button>
          <Button variant="secondary" asChild>
            <a href={`/dashboard/sales/${sale.id}/print`} target="_blank" rel="noopener">
              <Printer className="h-4 w-4 shrink-0 max-[359px]:hidden" aria-hidden="true" />
              Imprimir
            </a>
          </Button>
        </div>
        {canVoid ? (
          <Button variant="secondary" className="!text-status-danger sm:ml-auto" onClick={() => setVoidOpen(true)}>
            Anular venta
          </Button>
        ) : null}
      </div>

      <SaleReceiptDialog sale={sale} store={store} today={today} open={receiptOpen} onOpenChange={setReceiptOpen} />
      {canVoidSale(role) ? (
        <VoidSaleDialog sale={sale} open={voidOpen} onOpenChange={setVoidOpen} onVoided={setSale} onConflict={reload} />
      ) : null}
    </div>
  );
}
