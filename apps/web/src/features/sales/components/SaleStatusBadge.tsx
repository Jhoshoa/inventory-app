import { Badge } from "@/components/ui/Badge";
import type { Sale } from "../types";

export function SaleStatusBadge({ status }: { status: Sale["status"] }) {
  if (status === "completed") return <Badge variant="success">Completada</Badge>;
  if (status === "voided") return <Badge variant="danger">Anulada</Badge>;
  return <Badge>{status}</Badge>;
}
