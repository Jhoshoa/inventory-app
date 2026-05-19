import { PosWorkspace } from "@/features/pos/components/PosWorkspace";

export default function PosPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">POS</h1>
        <p className="mt-1 text-sm text-slate-600">
          Busca productos, arma el carrito y confirma ventas.
        </p>
      </div>
      <PosWorkspace />
    </section>
  );
}
