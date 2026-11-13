"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Printer, ReceiptText, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogTitle } from "@/components/ui/Dialog";
import { canVoidSale } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { shortSaleId } from "../list";
import type { Sale } from "../types";
import { SaleReceiptDialog } from "./SaleReceiptDialog";
import type { ReceiptStoreInfo } from "./SaleReceipt";
import { SaleStatusBadge } from "./SaleStatusBadge";
import { SaleLines, SaleTotals, SaleVoidedNote, saleSubtitle } from "./SaleSummary";
import { VoidSaleDialog } from "./VoidSaleDialog";

/**
 * Detalle al costado de la lista (tablero P06 · Escritorio). Desde 1280 px va junto a la
 * tabla; más angosto (tablet) se abre como ventana lateral, sin salir de la lista.
 */
export function SaleSidePanel({
  sale,
  role,
  store,
  today,
  asDrawer,
  onClose,
  onVoided,
  onConflict,
}: {
  sale: Sale;
  role: UserRole;
  store: ReceiptStoreInfo;
  today: string;
  asDrawer: boolean;
  onClose: () => void;
  onVoided: (sale: Sale) => void;
  onConflict: () => void;
}) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const canVoid = sale.status === "completed" && canVoidSale(role);

  // Al costado: el foco va al título para que el lector de pantalla anuncie la venta.
  useEffect(() => {
    if (!asDrawer) headingRef.current?.focus();
  }, [asDrawer, sale.id]);

  const header = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 ref={headingRef} tabIndex={-1} className="text-[17px] font-extrabold text-text-strong focus:outline-none">
          Venta {shortSaleId(sale.id)}
        </h2>
        <p className="text-[13px] text-text-muted">{saleSubtitle(sale, today, true)}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar detalle"
        className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-text-muted hover:bg-app-surface-muted hover:text-text-strong"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );

  const body = (
    <div className="flex flex-1 flex-col gap-3">
      <SaleStatusBadge status={sale.status} className="self-start" />
      <SaleVoidedNote sale={sale} today={today} />
      <SaleLines sale={sale} compact />
      <SaleTotals sale={sale} withPayment />

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setReceiptOpen(true)}>
            <ReceiptText className="h-4 w-4 shrink-0" aria-hidden="true" />
            Recibo
          </Button>
          <Button variant="secondary" asChild>
            <a href={`/dashboard/sales/${sale.id}/print`} target="_blank" rel="noopener">
              <Printer className="h-4 w-4 shrink-0" aria-hidden="true" />
              Imprimir
            </a>
          </Button>
        </div>
        <Button variant="secondary" asChild>
          <Link href={`/dashboard/sales/${sale.id}`}>Abrir página de la venta</Link>
        </Button>
        {canVoid ? (
          <Button variant="secondary" className="!text-status-danger" onClick={() => setVoidOpen(true)}>
            Anular venta
          </Button>
        ) : null}
      </div>

      <SaleReceiptDialog sale={sale} store={store} today={today} open={receiptOpen} onOpenChange={setReceiptOpen} />
      {canVoidSale(role) ? (
        <VoidSaleDialog sale={sale} open={voidOpen} onOpenChange={setVoidOpen} onVoided={onVoided} onConflict={onConflict} />
      ) : null}
    </div>
  );

  if (asDrawer) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()} position="right" className="!max-w-[380px]">
        <DialogTitle close>
          Venta {shortSaleId(sale.id)}
          <span className="block text-[13px] font-normal text-text-muted">{saleSubtitle(sale, today, true)}</span>
        </DialogTitle>
        <DialogBody className="flex flex-col pb-5">{body}</DialogBody>
      </Dialog>
    );
  }

  return (
    <aside
      aria-label="Detalle de la venta"
      className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col gap-3 overflow-y-auto rounded-card border border-app-border bg-app-surface p-[18px]"
    >
      {header}
      {body}
    </aside>
  );
}
