import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageSection } from "@/components/layout/PageSection";
import { ResponsiveToolbar } from "@/components/layout/ResponsiveToolbar";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";

export function ReportsPageSkeleton() {
  return (
    <PageSection className="space-y-6" aria-label="Cargando reportes">
      <PageHeader
        title="Reportes"
        description="Ventas, productos destacados y exportes administrativos."
        actions={
          <div className="flex gap-2">
            <div className="h-9 w-48 animate-pulse rounded-md bg-app-surface-muted" />
            <div className="h-9 w-36 animate-pulse rounded-md bg-app-surface-muted" />
            <div className="h-9 w-44 animate-pulse rounded-md bg-app-surface-muted" />
          </div>
        }
      />

      <ResponsiveToolbar className="md:grid md:grid-cols-[180px_minmax(160px,1fr)_minmax(160px,1fr)]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase text-text-muted">
            Rango
          </span>
          <Select aria-label="Rango de reportes" disabled>
            <option>Mes actual</option>
          </Select>
        </label>
        <DateInputSkeleton label="Desde" />
        <DateInputSkeleton label="Hasta" />
      </ResponsiveToolbar>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["Total vendido", "Ventas", "Artículos vendidos", "Ticket promedio"].map((label) => (
          <div
            key={label}
            className="rounded-lg border border-app-border bg-app-surface p-4 shadow-panel"
          >
            <p className="text-sm font-medium text-text-muted">{label}</p>
            <span className="mt-3 block h-8 w-28 animate-pulse rounded bg-app-surface-muted" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportTableSkeleton
          title="Metodo de pago"
          headers={["Metodo", "Ventas", "Total", "Participacion"]}
          textColumnIndex={0}
        />
        <ReportTableSkeleton
          title="Productos destacados"
          headers={["#", "Producto", "Cantidad", "Total"]}
          textColumnIndex={1}
        />
      </div>

      <div className="space-y-3 rounded-lg border border-app-border bg-app-surface p-4 shadow-panel">
        <div>
          <div className="h-5 w-28 animate-pulse rounded bg-app-border" />
          <div className="mt-1 h-4 w-72 animate-pulse rounded bg-app-border" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-1">
              <div className="h-9 w-full animate-pulse rounded-md bg-app-surface-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-app-border" />
            </div>
          ))}
        </div>
      </div>
    </PageSection>
  );
}

function DateInputSkeleton({ label }: { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase text-text-muted">
        {label}
      </span>
      <span className="relative block">
        <CalendarDays
          className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted"
          aria-hidden
        />
        <Input className="pl-9" type="date" aria-label={label} disabled />
      </span>
    </label>
  );
}

function ReportTableSkeleton({
  headers,
  title,
  textColumnIndex,
}: {
  headers: string[];
  title: string;
  textColumnIndex: number;
}) {
  return (
    <section className="min-w-0 space-y-3">
      <h2 className="text-base font-semibold text-text-strong">{title}</h2>
      <Table density="compact">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <TableHeaderCell
                key={header}
                align={index === textColumnIndex ? "left" : "right"}
              >
                {header}
              </TableHeaderCell>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }, (_, rowIndex) => (
            <TableRow key={rowIndex}>
              {headers.map((header, cellIndex) => (
                <TableCell
                  key={header}
                  align={cellIndex === textColumnIndex ? "left" : "right"}
                >
                  <span
                    className={`block h-4 animate-pulse rounded bg-app-surface-muted ${
                      cellIndex === textColumnIndex ? "w-32" : "ml-auto w-16"
                    }`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </tbody>
      </Table>
    </section>
  );
}
