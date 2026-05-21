import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { listInventoryImports } from "@/features/imports/api";
import { ImportFilters } from "@/features/imports/components/ImportFilters";
import { ImportsTable } from "@/features/imports/components/ImportsTable";
import { ImportUploadPanel } from "@/features/imports/components/ImportUploadPanel";
import { buildImportQueryString, parseImportSearchParams } from "@/features/imports/schemas";

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params = parseImportSearchParams(rawParams);
  const imports = await listInventoryImports(params);
  const urlParams = new URLSearchParams(buildImportQueryString(params));

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Import Image</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sube imagenes de listas o planillas, revisa los items detectados y confirma productos.
        </p>
      </div>

      <ImportUploadPanel />
      <ImportFilters params={params} />

      {!imports.ok ? (
        <Alert variant="error">
          No se pudo cargar Import Image: {imports.error.message}
        </Alert>
      ) : imports.data.total === 0 && params.status === "all" ? (
        <EmptyState
          title="Todavia no hay imagenes importadas"
          description="Sube una imagen para crear borradores revisables antes de afectar inventario."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ImportsTable imports={imports.data.items} />
          <Pagination
            basePath="/dashboard/imports"
            searchParams={urlParams}
            total={imports.data.total}
            limit={imports.data.limit}
            offset={imports.data.offset}
          />
        </div>
      )}
    </section>
  );
}
