import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { InventoryImport } from "../types";
import { countImportItems } from "../schemas";
import { ImportStatusBadge } from "./ImportStatusBadge";

export function ImportDetailHeader({ inventoryImport }: { inventoryImport: InventoryImport }) {
  const counts = countImportItems(inventoryImport.items);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-950">Importacion</h1>
            <ImportStatusBadge status={inventoryImport.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {inventoryImport.source_filename ?? inventoryImport.id}
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/dashboard/imports">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-5">
        <Metric label="Draft" value={counts.draft} />
        <Metric label="Aprobados" value={counts.approved} />
        <Metric label="Rechazados" value={counts.rejected} />
        <Metric label="Importados" value={counts.imported} />
        <Metric label="Fallidos" value={counts.failed} />
      </div>

      {inventoryImport.source_photo_url ? (
        <Button variant="ghost" asChild>
          <a href={inventoryImport.source_photo_url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" aria-hidden />
            Ver imagen original
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
