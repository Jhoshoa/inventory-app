import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-950">
            Crear tienda
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            El registro completo se conectara al backend despues de cerrar la base de auth.
          </p>
        </div>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-name">Nombre de tienda</Label>
            <Input id="store-name" name="storeName" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" disabled />
          </div>
          <Button className="w-full" disabled>
            Registro en Sprint posterior
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          Ya tienes cuenta?{" "}
          <Link className="font-medium text-slate-950 underline" href="/login">
            Inicia sesion
          </Link>
        </p>
      </section>
    </main>
  );
}
