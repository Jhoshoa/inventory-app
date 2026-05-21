import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableCell,
  TableEmptyRow,
  TableHeaderCell,
} from "@/components/ui/Table";
import type { InventoryImport } from "../types";
import { ImportStatusBadge } from "./ImportStatusBadge";

export function ImportsTable({ imports }: { imports: InventoryImport[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <TableHeaderCell>Archivo</TableHeaderCell>
          <TableHeaderCell>Estado</TableHeaderCell>
          <TableHeaderCell>Items</TableHeaderCell>
          <TableHeaderCell>Error</TableHeaderCell>
          <TableHeaderCell>Acciones</TableHeaderCell>
        </tr>
      </thead>
      <tbody>
        {imports.length === 0 ? (
          <TableEmptyRow colSpan={5}>Sin importaciones para este filtro</TableEmptyRow>
        ) : (
          imports.map((item) => (
            <tr key={item.id} className="border-t border-slate-100">
              <TableCell>
                <div>
                  <p className="font-medium text-slate-950">{item.source_filename ?? item.id.slice(0, 8)}</p>
                  <p className="text-xs text-slate-500">{item.source_content_type ?? "Sin tipo"}</p>
                </div>
              </TableCell>
              <TableCell><ImportStatusBadge status={item.status} /></TableCell>
              <TableCell>{item.items_count}</TableCell>
              <TableCell>{item.error_message ?? "N/A"}</TableCell>
              <TableCell>
                <Button variant="secondary" asChild>
                  <Link href={`/dashboard/imports/${item.id}`}>
                    {item.status === "needs_review" ? "Revisar" : "Ver"}
                  </Link>
                </Button>
              </TableCell>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );
}
