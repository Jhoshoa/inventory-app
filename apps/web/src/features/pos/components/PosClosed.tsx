import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Vender con la caja cerrada (Fase 4): el dueño va a Caja a abrirla; el cajero sabe
 * qué pedir. No se puede vender con la caja cerrada (la API también lo exige).
 */
export function PosClosed({ owner }: { owner: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[22px] font-extrabold tracking-tight text-text-strong sm:text-[26px]">Vender</h1>
      <section className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-card border border-app-border bg-app-surface px-6 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-status-warningBg">
          <LockKeyhole className="h-7 w-7 text-status-warning" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-extrabold text-text-strong">La caja está cerrada</h2>
        <p className="text-sm text-text-muted">
          {owner
            ? "Para vender, primero abre la caja con el efectivo con el que empiezas el día."
            : "Para vender, el dueño tiene que abrir la caja. Avísale y vuelve aquí."}
        </p>
        {owner ? (
          <Button asChild className="mt-1">
            <Link href="/dashboard/caja">Abrir caja</Link>
          </Button>
        ) : (
          <Button asChild variant="secondary" className="mt-1">
            <Link href="/dashboard">Volver a Inicio</Link>
          </Button>
        )}
      </section>
    </div>
  );
}
