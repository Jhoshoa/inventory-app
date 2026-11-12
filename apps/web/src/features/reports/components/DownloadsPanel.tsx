import { Download } from "lucide-react";
import { buildExportDateTimeQuery } from "../schemas";
import type { ReportSearchParams } from "../types";

/** Descargas en CSV (tablero P08, dueño): el catálogo sin fechas; lo demás con el rango. */
export function DownloadsPanel({ params }: { params: ReportSearchParams }) {
  const range = buildExportDateTimeQuery(params);
  const items = [
    { label: "Productos", description: "Catálogo actual, sin fechas", href: "/api/exports/products" },
    { label: "Ventas", description: "Completadas y anuladas", href: `/api/exports/sales?${range}` },
    { label: "Movimientos de stock", description: "Entradas y salidas", href: `/api/exports/stock-movements?${range}` },
    { label: "Movimientos de caja", description: "Entradas, gastos, retiros", href: `/api/exports/cash-movements?${range}` },
  ];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">Rango para ventas y movimientos (máx. 90 días).</p>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3 rounded-card border border-app-border bg-app-surface px-4 py-3">
            <div className="min-w-0">
              <p className="font-bold text-text-strong">{item.label}</p>
              <p className="text-[13px] text-text-muted">{item.description}</p>
            </div>
            <a
              href={item.href}
              download
              aria-label={`Descargar ${item.label}`}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-control border border-app-borderStrong bg-app-surface px-3 text-sm font-semibold text-text-strong hover:bg-app-surface-muted focus:outline-none focus:ring-2 focus:ring-focus"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Descargar
            </a>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-text-muted">Se abre en Excel o Google Sheets.</p>
    </div>
  );
}
