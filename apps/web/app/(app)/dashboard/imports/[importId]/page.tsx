import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { getInventoryImport } from "@/features/imports/api";
import { ImportCancelDialog } from "@/features/imports/components/ImportCancelDialog";
import { ImportConfirmPanel } from "@/features/imports/components/ImportConfirmPanel";
import { ImportDetailHeader } from "@/features/imports/components/ImportDetailHeader";
import { ImportRawTextPanel } from "@/features/imports/components/ImportRawTextPanel";
import { ImportReviewTable } from "@/features/imports/components/ImportReviewTable";
import { canCreateImport } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function ImportDetailPage({
  params,
}: {
  params: Promise<{ importId: string }>;
}) {
  const { importId } = await params;
  const session = await requireSession();
  if (!canCreateImport(session.role)) {
    return <ForbiddenState description="Import Image requiere permisos de owner." />;
  }

  const inventoryImport = await getInventoryImport(importId);

  if (!inventoryImport.ok) {
    if (inventoryImport.error.status === 404) notFound();
    return (
      <section className="space-y-6">
        <Alert variant="error">
          No se pudo cargar Import Image: {inventoryImport.error.message}
        </Alert>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <ImportDetailHeader inventoryImport={inventoryImport.data} />

      {inventoryImport.data.error_message ? (
        <Alert variant="error">{inventoryImport.data.error_message}</Alert>
      ) : null}

      <ImportRawTextPanel rawText={inventoryImport.data.raw_text} />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <ImportReviewTable inventoryImport={inventoryImport.data} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <ImportConfirmPanel inventoryImport={inventoryImport.data} role={session.role} />
        <div className="flex items-start justify-end">
          <ImportCancelDialog inventoryImport={inventoryImport.data} />
        </div>
      </div>
    </section>
  );
}
