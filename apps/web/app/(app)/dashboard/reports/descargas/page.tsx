import type { Metadata } from "next";
import { ForbiddenState } from "@/components/ui/ForbiddenState";
import { DownloadsPanel } from "@/features/reports/components/DownloadsPanel";
import { ReportsHeader } from "@/features/reports/components/ReportsHeader";
import { parseReportSearchParams } from "@/features/reports/schemas";
import { canExport } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Descargas" };

// Reportes › Descargas (tablero P08, solo el dueño, como la API).
export default async function ReportDownloadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  if (!canExport(session.role)) {
    return <ForbiddenState description="Las descargas son solo del dueño de la tienda." />;
  }
  const params = parseReportSearchParams(await searchParams);
  return (
    <div className="flex flex-col gap-3">
      <ReportsHeader section="descargas" role={session.role} params={params} />
      <DownloadsPanel params={params} />
    </div>
  );
}
