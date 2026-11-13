"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SaleReceipt, type ReceiptStoreInfo } from "./SaleReceipt";
import type { Sale } from "../types";

/** Página de impresión: el ticket en papel de 80 mm (impresora térmica o PDF). */
export function SalePrintView({ sale, store }: { sale: Sale; store: ReceiptStoreInfo }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 py-8 print:max-w-none print:py-0">
      {/* Solo en esta página: la hoja es el ticket (el resto de la app imprime en carta). */}
      <style>{"@media print { @page { size: 80mm auto; margin: 4mm; } }"}</style>
      <div className="print-hidden flex justify-center">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Imprimir
        </Button>
      </div>
      <SaleReceipt sale={sale} store={store} />
    </div>
  );
}
