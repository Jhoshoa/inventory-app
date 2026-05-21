import { Check, Minus } from "lucide-react";
import {
  Table,
  TableCell,
  TableHeaderCell,
} from "@/components/ui/Table";

const permissions = [
  { label: "Vender en POS", cashier: true, owner: true },
  { label: "Consultar productos y stock", cashier: true, owner: true },
  { label: "Ver reportes basicos", cashier: true, owner: true },
  { label: "Anular ventas", cashier: false, owner: true },
  { label: "Exportar CSV", cashier: false, owner: true },
  { label: "Administrar usuarios", cashier: false, owner: true },
] as const;

export function PermissionMatrix() {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-slate-950">Permisos v1</h2>
      <Table>
        <thead>
          <tr>
            <TableHeaderCell>Accion</TableHeaderCell>
            <TableHeaderCell>Cashier</TableHeaderCell>
            <TableHeaderCell>Owner</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {permissions.map((permission) => (
            <tr key={permission.label} className="border-t border-slate-100">
              <TableCell>{permission.label}</TableCell>
              <TableCell><PermissionIcon allowed={permission.cashier} /></TableCell>
              <TableCell><PermissionIcon allowed={permission.owner} /></TableCell>
            </tr>
          ))}
        </tbody>
      </Table>
    </section>
  );
}

function PermissionIcon({ allowed }: { allowed: boolean }) {
  if (!allowed) {
    return <Minus className="h-4 w-4 text-slate-400" aria-label="No permitido" />;
  }

  return <Check className="h-4 w-4 text-emerald-600" aria-label="Permitido" />;
}
