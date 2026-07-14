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

export function SalesTableSkeleton() {
  return (
    <PageSection className="space-y-6" aria-label="Cargando ventas">
      <PageHeader
        eyebrow="Operacion"
        title="Ventas"
        description="Historial de ventas registradas en la tienda."
      />

      <ResponsiveToolbar className="md:grid md:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_180px]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase text-text-muted">
            Desde
          </span>
          <span className="relative block">
            <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted" aria-hidden />
            <Input type="date" disabled className="pl-9" aria-label="Desde" />
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase text-text-muted">
            Hasta
          </span>
          <span className="relative block">
            <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-muted" aria-hidden />
            <Input type="date" disabled className="pl-9" aria-label="Hasta" />
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase text-text-muted">
            Estado
          </span>
          <Select disabled aria-label="Estado de venta">
            <option>Todas</option>
          </Select>
        </label>
      </ResponsiveToolbar>

      <Table density="compact">
        <thead>
          <tr>
            <TableHeaderCell>Fecha</TableHeaderCell>
            <TableHeaderCell>Estado</TableHeaderCell>
            <TableHeaderCell>Metodo</TableHeaderCell>
            <TableHeaderCell align="right">Artículos</TableHeaderCell>
            <TableHeaderCell align="right">Total</TableHeaderCell>
            <TableHeaderCell align="right">Acciones</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }, (_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: 6 }, (_, cellIndex) => (
                <TableCell
                  key={cellIndex}
                  align={cellIndex >= 3 ? "right" : "left"}
                >
                  <span
                    className={`block h-4 animate-pulse rounded bg-app-surface-muted ${
                      cellIndex === 0
                        ? "w-28"
                        : cellIndex === 1
                          ? "w-20"
                          : cellIndex === 5
                            ? "ml-auto w-9"
                            : "w-16"
                    }`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </tbody>
      </Table>

      <div className="flex items-center justify-between">
        <div className="h-4 w-48 animate-pulse rounded bg-app-border" />
        <div className="flex gap-1">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-8 w-8 animate-pulse rounded-md bg-app-surface-muted"
            />
          ))}
        </div>
      </div>
    </PageSection>
  );
}
