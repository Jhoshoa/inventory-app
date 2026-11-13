import { formatCurrency } from "@/lib/format/currency";
import type { DifferenceKind } from "../closings";

const STYLE: Record<DifferenceKind, string> = {
  even: "border-status-successBorder bg-status-successBg text-status-success",
  short: "border-status-warningBorder bg-status-warningBg text-status-warning",
  over: "border-status-warningBorder bg-status-warningBg text-status-warning",
  uncounted: "border-app-border bg-app-surface-muted text-text-muted",
};

/** Verde "Cuadra", naranja "Falta Bs 5,00" / "Sobra Bs 3,00", gris "Sin conteo". */
export function DifferenceTag({ kind, amount }: { kind: DifferenceKind; amount: number }) {
  const text =
    kind === "even" ? "Cuadra" : kind === "uncounted" ? "Sin conteo" : `${kind === "short" ? "Falta" : "Sobra"} ${formatCurrency(amount)}`;
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${STYLE[kind]}`}>{text}</span>
  );
}
