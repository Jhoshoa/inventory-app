"use client";

import { MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { saleReceiptText, whatsappHref } from "../list";
import { SaleReceipt, type ReceiptStoreInfo } from "./SaleReceipt";
import type { Sale } from "../types";

/** Recibo (tablero P06): la vista del ticket con WhatsApp e Imprimir (página de 80 mm). */
export function SaleReceiptDialog({
  sale,
  store,
  today,
  open,
  onOpenChange,
}: {
  sale: Sale;
  store: ReceiptStoreInfo;
  today: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} position="sheet" size="sm">
      <DialogTitle close>Recibo</DialogTitle>
      <DialogBody className="bg-app-surface-muted pb-4">
        <SaleReceipt sale={sale} store={store} />
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" className="flex-1" asChild>
          <a href={whatsappHref(saleReceiptText(sale, store.name, today))} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            WhatsApp
          </a>
        </Button>
        <Button className="flex-1" asChild>
          <a href={`/dashboard/sales/${sale.id}/print`} target="_blank" rel="noopener">
            <Printer className="h-4 w-4" aria-hidden="true" />
            Imprimir
          </a>
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
