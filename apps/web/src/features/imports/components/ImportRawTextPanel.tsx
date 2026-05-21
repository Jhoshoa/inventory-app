import { EmptyState } from "@/components/ui/EmptyState";

export function ImportRawTextPanel({ rawText }: { rawText: string | null }) {
  if (!rawText) {
    return (
      <EmptyState
        title="Sin texto OCR"
        description="El backend no devolvio texto crudo para esta imagen. Verifica que el OCR este instalado y activo."
      />
    );
  }

  return (
    <details className="rounded-lg border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-950">
        Texto OCR original
      </summary>
      <pre className="mt-3 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">
        {rawText}
      </pre>
    </details>
  );
}
