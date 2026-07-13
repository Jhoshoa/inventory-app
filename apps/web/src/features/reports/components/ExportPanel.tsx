import { Download } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { canExport } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import { buildExportDateTimeQuery } from "../schemas";
import type { ReportSearchParams } from "../types";

export function ExportPanel({
  role,
  reportParams,
}: {
  role: UserRole;
  reportParams: ReportSearchParams;
}) {
  const allowed = canExport(role);
  const exportQuery = buildExportDateTimeQuery(reportParams);

  return (
    <section className="space-y-3 rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
      <div>
        <h2 className="text-base font-semibold text-text-strong">Exportes CSV</h2>
        <p className="mt-1 text-sm text-text-muted">
          Descarga productos, ventas o movimientos para analisis externo.
        </p>
      </div>
      {!allowed ? (
        <Alert>
          Los exportes requieren rol de propietario. Puedes ver reportes, pero no extraer
          datos masivos.
        </Alert>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <ExportOption
          allowed={allowed}
          description="Catalogo actual de productos."
          href="/api/exports/products"
          label="Productos"
        />
        <ExportOption
          allowed={allowed}
          description="Ventas del POS."
          href={`/api/exports/sales?${exportQuery}`}
          label="Ventas"
        />
        <ExportOption
          allowed={allowed}
          description="Cambios de inventario."
          href={`/api/exports/stock-movements?${exportQuery}`}
          label="Movimientos"
        />
        <ExportOption
          allowed={allowed}
          description="Entradas/salidas manuales de efectivo."
          href={`/api/exports/cash-movements?${exportQuery}`}
          label="Caja"
        />
      </div>
    </section>
  );
}

function ExportOption({
  allowed,
  description,
  href,
  label,
}: {
  allowed: boolean;
  description: string;
  href: string;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <ExportLink allowed={allowed} href={href} label={label} />
      <p className="text-xs leading-5 text-text-muted">{description}</p>
    </div>
  );
}

function ExportLink({ allowed, href, label }: { allowed: boolean; href: string; label: string }) {
  if (!allowed) {
    return (
      <Button className="w-full" variant="secondary" disabled>
        <Download className="h-4 w-4" aria-hidden />
        {label}
      </Button>
    );
  }

  return (
    <Button className="w-full" variant="secondary" asChild>
      <a href={href}>
        <Download className="h-4 w-4" aria-hidden />
        {label}
      </a>
    </Button>
  );
}
