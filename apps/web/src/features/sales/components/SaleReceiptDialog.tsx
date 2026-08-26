"use client";

import { useState } from "react";
import { Printer, Receipt as ReceiptIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { SaleReceipt, type ReceiptStoreInfo } from "./SaleReceipt";
import type { Sale } from "../types";

export function SaleReceiptDialog({ sale, store }: { sale: Sale; store: ReceiptStoreInfo }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <ReceiptIcon className="h-4 w-4" aria-hidden="true" />
        Ver recibo
      </Button>
      <Dialog open={open} onOpenChange={setOpen} size="lg">
        <DialogTitle close>Recibo de venta</DialogTitle>
        <DialogBody>
          <SaleReceipt sale={sale} store={store} />
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
          <Button asChild>
            <a href={`/dashboard/sales/${sale.id}/print`} target="_blank" rel="noopener noreferrer">
              <Printer className="h-4 w-4" aria-hidden="true" />
              Imprimir / Descargar PDF
            </a>
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
