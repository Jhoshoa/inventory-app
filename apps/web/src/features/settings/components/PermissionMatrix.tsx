import { Check, Minus } from "lucide-react";
import {
  Table,
  TableCell,
  TableHeaderCell,
  TableRow,
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
    <div className="overflow-hidden rounded-lg border border-app-border">
      <Table density="compact">
        <thead>
          <tr>
            <TableHeaderCell>Accion</TableHeaderCell>
            <TableHeaderCell align="center">Cashier</TableHeaderCell>
            <TableHeaderCell align="center">Owner</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {permissions.map((permission) => (
            <TableRow key={permission.label}>
              <TableCell>{permission.label}</TableCell>
              <TableCell align="center"><PermissionIcon allowed={permission.cashier} /></TableCell>
              <TableCell align="center"><PermissionIcon allowed={permission.owner} /></TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function PermissionIcon({ allowed }: { allowed: boolean }) {
  if (!allowed) {
    return <Minus className="h-4 w-4 text-text-disabled" aria-label="No permitido" />;
  }

  return <Check className="h-4 w-4 text-status-success" aria-label="Permitido" />;
}
