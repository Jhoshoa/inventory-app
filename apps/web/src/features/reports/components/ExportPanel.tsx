import { Download } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { canExport } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import type { ReportSearchParams } from "../types";

export function ExportPanel({
  role,
  reportParams,
}: {
  role: UserRole;
  reportParams: ReportSearchParams;
}) {
  const allowed = canExport(role);
  const salesQuery = new URLSearchParams({
    from: reportParams.from,
    to: reportParams.to,
  }).toString();

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-base font-semibold text-slate-950">Exportes CSV</h2>
        <p className="mt-1 text-sm text-slate-600">
          Descarga productos, ventas o movimientos para analisis externo.
        </p>
      </div>
      {!allowed ? (
        <Alert>
          Los exportes requieren rol owner. Puedes ver reportes, pero no extraer
          datos masivos.
        </Alert>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <ExportLink allowed={allowed} href="/api/exports/products" label="Productos" />
        <ExportLink allowed={allowed} href={`/api/exports/sales?${salesQuery}`} label="Ventas" />
        <ExportLink
          allowed={allowed}
          href={`/api/exports/stock-movements?${salesQuery}`}
          label="Movimientos"
        />
      </div>
    </section>
  );
}

function ExportLink({
  allowed,
  href,
  label,
}: {
  allowed: boolean;
  href: string;
  label: string;
}) {
  if (!allowed) {
    return (
      <Button variant="secondary" disabled>
        <Download className="h-4 w-4" aria-hidden />
        {label}
      </Button>
    );
  }

  return (
    <Button variant="secondary" asChild>
      <a href={href}>
        <Download className="h-4 w-4" aria-hidden />
        {label}
      </a>
    </Button>
  );
}
