"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SaleReceipt, type ReceiptStoreInfo } from "./SaleReceipt";
import type { Sale } from "../types";

export function SalePrintView({ sale, store }: { sale: Sale; store: ReceiptStoreInfo }) {
  return (
    <div className="mx-auto max-w-md space-y-4 py-8">
      <div className="print-hidden flex justify-center">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden="true" />
          Imprimir / Descargar PDF
        </Button>
      </div>
      <SaleReceipt sale={sale} store={store} />
    </div>
  );
}
