"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductCsvImportDialog } from "./ProductCsvImportDialog";

export function ProductCsvImportTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
        Importar CSV
      </Button>
      <ProductCsvImportDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}
